package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/shravanasati/redline/services/shared/env"
	"github.com/shravanasati/redline/services/shared/logging"
	"github.com/shravanasati/redline/services/shared/natsconn"
)

const (
	defaultWorkerPool = 64
	fetchMaxWait      = 10 * time.Second
	fetchHeartbeat    = 3 * time.Second // must be < fetchMaxWait/2
)

var cfg workerConfig

func main() {
	logger := logging.New(logging.Config{
		Service: "grid-worker",
		Level:   slog.LevelInfo,
		Format:  logging.FormatText,
	})

	var err error
	if err = env.Load(logger); err != nil {
		logger.Error("failed to load .env file", "err", err)
		os.Exit(1)
	}

	cfg, err = configFromEnv()
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
	defer connector.Drain()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if _, err := connector.EnsureStream(ctx, natsconn.TaskStreamConfig); err != nil {
		logger.Error("failed to ensure TASKS stream", "err", err)
		os.Exit(1)
	}

	if _, err := connector.EnsureStream(ctx, natsconn.ResultStreamConfig); err != nil {
		logger.Error("failed to ensure RESULTS stream", "err", err)
		os.Exit(1)
	}

	consumer, err := connector.EnsureConsumer(ctx, natsconn.TasksStreamName, jetstream.ConsumerConfig{
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

	discoveryStore, err := connector.EnsureKV(ctx, natsconn.DiscoveryKVConfig)
	if err != nil {
		logger.Error("failed to ensure discovery bucket", "err", err)
		os.Exit(1)
	}

	_, err = discoveryStore.Put(ctx, "regions."+cfg.Region, []byte("ping"))
	if err != nil {
		logger.Error("failed to register worker for discovery", "err", err)
		os.Exit(1)
	}
	go heartbeat(ctx, logger, discoveryStore, cfg.Region)

	logger.Info("grid-worker registered and ready", "region", cfg.Region, "subject", "tasks."+cfg.Region)

	if err := runLoop(ctx, logger, connector, consumer, cfg.Region, cfg.PoolSize); err != nil {
		logger.Error("worker loop terminated with error", "err", err)
		os.Exit(1)
	}

	logger.Info("grid-worker shut down cleanly")
}
