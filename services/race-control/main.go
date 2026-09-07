package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	pgxuuid "github.com/jackc/pgx-gofrs-uuid"
	"github.com/jackc/pgx/v5"

	natsgo "github.com/nats-io/nats.go"
	"google.golang.org/protobuf/proto"

	"github.com/shravanasati/redline/services/shared/logging"
	"github.com/shravanasati/redline/services/shared/natsconn"
	"github.com/shravanasati/redline/services/shared/safemap"
)

var dedupeInterval = time.Second * 20

// maxInflightPublishes bounds concurrent NATS publishes so a slow
// broker applies backpressure to the Out consumer (via pubSem) instead
// of stalling the timing wheel. Must exceed peak fires/s * regions.
const maxInflightPublishes = 4096

var regionMap = safemap.New[string, struct{}]()
var monitorMap = safemap.New[string, Monitor]()
var tw *MonitorWheel

var (
	statFires         atomic.Int64
	statPublished     atomic.Int64
	statDuplicates    atomic.Int64
	statPublishFailed atomic.Int64
	statNoWorkers     atomic.Int64
)

func main() {
	logger := logging.New(logging.Config{
		Service: "race-control",
		Level:   slog.LevelInfo,
		Format:  logging.FormatText,
	})

	config, err := configFromEnv(logger)
	if err != nil {
		logger.Error("failed to load config", "err", err)
		os.Exit(1)
	}

	conn, err := ensurePGConn(config.PostgresURL)
	if err != nil {
		logger.Error("failed to connect to Postgres", "err", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	natsConnector := ensureNATSConn(logger, config)
	defer natsConnector.Drain()

	discoveryKV, err := natsConnector.EnsureKV(context.Background(), natsconn.DiscoveryKVConfig)
	if err != nil {
		logger.Error("failed to establish discovery KV store", "err", err)
		os.Exit(1)
	}
	go workerWatcher(context.Background(), logger, discoveryKV)

	natsConnector.Conn().Subscribe("monitors.events", func(msg *natsgo.Msg) {
		handleMonitorEvent(logger, msg)
	})

	// get monitors
	queryCtx, queryCancel := context.WithTimeout(context.Background(), time.Second*10)
	defer queryCancel()
	err = fetchActiveMonitors(queryCtx, conn)
	if err != nil {
		logger.Error("failed to fetch active monitors", "err", err)
		os.Exit(1)
	}
	logger.Info("loaded active monitors", "count", monitorMap.Len())

	// initialise the timing wheel with a generous output buffer
	tw = NewMonitorWheel(max(monitorMap.Len()*8, 100000))
	for _, m := range monitorMap.Values() {
		tw.LoadWithJitter(m)
	}
	tw.Start()

	// Bound concurrent NATS publishes; the Out consumer blocks on pubSem
	// (backpressure into Out) instead of blocking the wheel tick thread.
	pubSem := make(chan struct{}, maxInflightPublishes)
	var pubWg sync.WaitGroup
	var dispWg sync.WaitGroup

	// Periodic stats so wheel drops / publish failures are visible.
	statsDone := make(chan struct{})
	go func() {
		t := time.NewTicker(15 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-statsDone:
				return
			case <-t.C:
				logger.Info("dispatch stats",
					"fires", statFires.Load(),
					"published", statPublished.Load(),
					"duplicates", statDuplicates.Load(),
					"publishFailed", statPublishFailed.Load(),
					"noWorkers", statNoWorkers.Load(),
					"wheelDrops", WheelDrops.Load(),
					"outLen", len(tw.Out),
					"inflight", len(pubSem),
				)
			}
		}
	}()

	// consume dispatched monitors without stalling on broker latency
	dispWg.Add(1)
	go func() {
		defer dispWg.Done()
		for m := range tw.Out {
			statFires.Add(1)
			builtTask, err := buildMonitorTask(m)
			if err != nil {
				logger.Error("failed to build task", "err", err)
				continue
			}

			logger.Debug("monitor fired", "id", builtTask.GetId(), "name", m.Name, "endpoint", m.Endpoint)

			data, err := proto.Marshal(builtTask)
			if err != nil {
				logger.Error("marshal failed", "task_id", builtTask.GetId(), "err", err)
				continue
			}

			jobSlot := time.Now().Unix() / int64(dedupeInterval.Seconds())
			jobID := fmt.Sprintf("%s:%d", builtTask.GetId(), jobSlot)

			activeRegions := regionMap.Keys()
			if len(activeRegions) == 0 {
				n := statNoWorkers.Add(1)
				// Throttle: warn once per ~100 fires without workers.
				if (n-1)%100 == 0 {
					logger.Warn("no workers available to dispatch tasks to.", "droppedFires", n)
				}
				continue
			}
			for _, region := range activeRegions {
				pubSem <- struct{}{}
				pubWg.Add(1)
				go func(region string) {
					defer pubWg.Done()
					defer func() { <-pubSem }()
					msg := natsgo.NewMsg("tasks." + region)
					msg.Data = data
					msg.Header.Set("Nats-TTL", fmt.Sprintf("%.0ds", int(float64(m.Frequency)*0.9)))
					msg.Header.Set("Nats-Msg-Id", jobID+":"+region)

					publishCtx, publishCancel := context.WithTimeout(context.Background(), time.Second*5)
					defer publishCancel()
					ack, err := natsConnector.PublishMsg(publishCtx, msg)
					if err != nil {
						statPublishFailed.Add(1)
						logger.Error("async publish failed", "task_id", builtTask.GetId(), "region", region, "err", err)
						return
					}
					if ack != nil && ack.Duplicate {
						statDuplicates.Add(1)
						return
					}
					statPublished.Add(1)
				}(region)
			}
		}
	}()

	// block until SIGINT or SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go startMonitorResyncWorker(ctx, logger, conn)
	<-ctx.Done()
	logger.Info("shutting down", "signal", ctx.Err(),
		"fires", statFires.Load(),
		"published", statPublished.Load(),
		"duplicates", statDuplicates.Load(),
		"publishFailed", statPublishFailed.Load(),
		"noWorkers", statNoWorkers.Load(),
		"wheelDrops", WheelDrops.Load(),
	)
	close(statsDone)
	tw.Stop()
	dispWg.Wait()
	pubWg.Wait()
}

func ensurePGConn(url string) (*pgx.Conn, error) {
	pgCtx, pgCancel := context.WithTimeout(context.Background(), time.Second*10)
	defer pgCancel()
	conn, err := pgx.Connect(pgCtx, url)
	if err != nil {
		return nil, err
	}

	pgxuuid.Register(conn.TypeMap())
	return conn, err
}

func ensureNATSConn(logger *slog.Logger, config *dispatcherConfig) *natsconn.NATSConnector {
	connector, err := natsconn.New(logger, natsconn.Config{
		URL:      config.NATSURL,
		Name:     "race-control",
		Username: config.NATSUsername,
		Password: config.NatsPassword,
	})
	if err != nil {
		logger.Error("failed to connect to NATS", "err", err)
		os.Exit(1)
	}

	natsCtx, natsCancel := context.WithTimeout(context.Background(), time.Second*10)
	defer natsCancel()

	if _, err := connector.EnsureStream(natsCtx, natsconn.TaskStreamConfig); err != nil {
		logger.Error("failed to ensure TASKS stream", "err", err)
		os.Exit(1)
	}

	return connector
}
