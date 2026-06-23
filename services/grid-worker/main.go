package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/shravanasati/redline/services/shared/env"
	"github.com/shravanasati/redline/services/shared/logging"
	"github.com/shravanasati/redline/services/shared/natsconn"
	"github.com/shravanasati/redline/services/shared/pb/tasks"
	"google.golang.org/protobuf/proto"
)

const (
	tasksStream       = "TASKS"
	resultsStream     = "RESULTS"
	defaultWorkerPool = 8
	fetchMaxWait      = 10 * time.Second
	fetchHeartbeat    = 3 * time.Second // must be < fetchMaxWait/2
)

// workerConfig holds all runtime configuration for the grid-worker.
type workerConfig struct {
	Region   string
	NATSUrl  string
	NATSUser string
	NATSPass string
	PoolSize int
}

// configFromEnv reads required environment variables and returns a workerConfig.
// WORKER_POOL_SIZE is optional and defaults to defaultWorkerPool.
func configFromEnv() (workerConfig, error) {
	lookup := func(key string) (string, error) {
		v, ok := os.LookupEnv(key)
		if !ok || v == "" {
			return "", fmt.Errorf("required environment variable %q is not set", key)
		}
		return v, nil
	}

	region, err := lookup("WORKER_REGION")
	if err != nil {
		return workerConfig{}, err
	}
	natsURL, err := lookup("NATS_URL")
	if err != nil {
		return workerConfig{}, err
	}
	natsUser, err := lookup("NATS_USER_WORKER")
	if err != nil {
		return workerConfig{}, err
	}
	natsPass, err := lookup("NATS_PASS_WORKER")
	if err != nil {
		return workerConfig{}, err
	}

	poolSize := defaultWorkerPool
	if raw, ok := os.LookupEnv("WORKER_POOL_SIZE"); ok && raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			poolSize = n
		}
	}

	return workerConfig{
		Region:   region,
		NATSUrl:  natsURL,
		NATSUser: natsUser,
		NATSPass: natsPass,
		PoolSize: poolSize,
	}, nil
}

func main() {
	logger := logging.New(logging.Config{
		Service: "grid-worker",
		Level:   slog.LevelInfo,
		Format:  logging.FormatText,
	})

	if err := env.Load(logger); err != nil {
		logger.Error("failed to load .env file", "err", err)
		os.Exit(1)
	}

	cfg, err := configFromEnv()
	if err != nil {
		logger.Error("configuration error", "err", err)
		os.Exit(1)
	}

	logger.Info("grid-worker starting", "region", cfg.Region, "pool_size", cfg.PoolSize)

	connector, err := natsconn.New(logger, natsconn.Config{
		URL:      cfg.NATSUrl,
		Name:     "grid-worker-" + cfg.Region,
		Username: cfg.NATSUser,
		Password: cfg.NATSPass,
	})
	if err != nil {
		logger.Error("failed to connect to NATS", "err", err)
		os.Exit(1)
	}
	defer connector.Drain() //nolint:errcheck

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if _, err := connector.EnsureStream(ctx, jetstream.StreamConfig{
		Name:        tasksStream,
		Subjects:    []string{"tasks.>"},
		Retention:   jetstream.WorkQueuePolicy,
		Discard:     jetstream.DiscardOld,
		AllowMsgTTL: true,
		MaxAge:      time.Hour,
		Storage:     jetstream.FileStorage,
		Duplicates:  2 * time.Minute,
	}); err != nil {
		logger.Error("failed to ensure TASKS stream", "err", err)
		os.Exit(1)
	}

	if _, err := connector.EnsureStream(ctx, jetstream.StreamConfig{
		Name:      resultsStream,
		Subjects:  []string{"results.>"},
		Retention: jetstream.WorkQueuePolicy,
		Discard:   jetstream.DiscardOld,
		MaxAge:    24 * time.Hour,
		Storage:   jetstream.FileStorage,
	}); err != nil {
		logger.Error("failed to ensure RESULTS stream", "err", err)
		os.Exit(1)
	}

	consumer, err := connector.EnsureConsumer(ctx, tasksStream, jetstream.ConsumerConfig{
		Durable:       "worker-" + cfg.Region,
		FilterSubject: "tasks." + cfg.Region,
		// DeliverPolicy: jetstream.DeliverNewPolicy,
		ReplayPolicy: jetstream.ReplayInstantPolicy,
		AckPolicy:    jetstream.AckExplicitPolicy,
		AckWait:      30 * time.Second,
		MaxDeliver:   5,
		BackOff:      []time.Duration{5 * time.Second, 15 * time.Second, 30 * time.Second},
	})
	if err != nil {
		logger.Error("failed to ensure pull consumer", "err", err)
		os.Exit(1)
	}

	logger.Info("grid-worker ready", "region", cfg.Region, "subject", "tasks."+cfg.Region)

	if err := runLoop(ctx, logger, connector, consumer, cfg.Region, cfg.PoolSize); err != nil {
		logger.Error("worker loop terminated with error", "err", err)
		os.Exit(1)
	}

	logger.Info("grid-worker shut down cleanly")
}

// runLoop fetches tasks in batches of poolSize, dispatching each to a worker
// goroutine. A semaphore channel bounds the number of concurrent probes to
// poolSize, so a slow probe batch blocks the next Fetch rather than spawning
// unbounded goroutines. On context cancellation the loop stops fetching and
// waits for all in-flight goroutines to finish before returning.
func runLoop(
	ctx context.Context,
	logger *slog.Logger,
	connector *natsconn.NATSConnector,
	consumer jetstream.Consumer,
	region string,
	poolSize int,
) error {
	resultSubject := "results." + region

	// sem caps the number of goroutines running concurrently.
	sem := make(chan struct{}, poolSize)
	var wg sync.WaitGroup

	for {
		// Check for shutdown before each fetch.
		if ctx.Err() != nil {
			wg.Wait()
			return nil
		}

		batch, err := consumer.Fetch(poolSize,
			jetstream.FetchMaxWait(fetchMaxWait),
			jetstream.FetchHeartbeat(fetchHeartbeat),
		)
		if err != nil {
			// A cancelled context or a closed connection is a clean exit.
			if ctx.Err() != nil || errors.Is(err, jetstream.ErrMsgIteratorClosed) {
				wg.Wait()
				return nil
			}
			logger.Error("fetch error", "err", err)
			continue
		}

		for msg := range batch.Messages() {
			// Block here if the pool is full — natural back-pressure so we
			// don't accumulate more goroutines than poolSize.
			sem <- struct{}{}
			wg.Add(1)

			go func(m jetstream.Msg) {
				defer wg.Done()
				defer func() { <-sem }()
				processTask(ctx, logger, connector, m, resultSubject)
			}(msg)
		}

		// batch.Error() is non-nil only on terminal fetch errors (not ErrNoMessages).
		if err := batch.Error(); err != nil && ctx.Err() == nil {
			logger.Error("fetch batch terminated with error", "err", err)
		}
	}
}

// processTask unmarshals the raw NATS message into a MonitorTask, executes the
// appropriate probe, publishes the result, and acks or naks the message. It is
// designed to run in its own goroutine.
func processTask(
	ctx context.Context,
	logger *slog.Logger,
	connector *natsconn.NATSConnector,
	msg jetstream.Msg,
	resultSubject string,
) {
	var task tasks.MonitorTask
	if err := proto.Unmarshal(msg.Data(), &task); err != nil {
		// Malformed payload — Term so it is never re-delivered.
		logger.Error("malformed task proto; terminating message",
			"subject", msg.Subject(), "err", err)
		_ = msg.Term()
		return
	}

	logger.Info("executing probe", "task_id", task.GetId(), "type", task.GetType())

	result, err := executeProbe(&task)
	if err != nil {
		logger.Error("task validation failed; terminating message", "task_id", task.GetId(), "err", err)
		_ = msg.Term()
		return
	}

	resultBytes, err := proto.Marshal(result)
	if err != nil {
		logger.Error("failed to marshal result; naking", "task_id", task.GetId(), "err", err)
		_ = msg.Nak()
		return
	}

	if _, err := connector.Publish(ctx, resultSubject, resultBytes); err != nil {
		logger.Error("failed to publish result; naking",
			"task_id", task.GetId(), "subject", resultSubject, "err", err)
		_ = msg.Nak()
		return
	}

	// Don't nak after a successful publish — that would cause re-execution and a
	// duplicate result even if the ack itself fails.
	if err := msg.Ack(); err != nil {
		logger.Error("failed to ack message", "task_id", task.GetId(), "err", err)
	}

	logger.Info("probe complete",
		"task_id", task.GetId(),
		"success", result.GetSuccess(),
		"result_subject", resultSubject,
	)
}
