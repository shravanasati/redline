package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"sync"
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

var regionMap = safemap.New[string, struct{}]()
var monitorMap = safemap.New[string, Monitor]()
var tw *MonitorWheel

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
	tw = NewMonitorWheel((monitorMap.Len()) * 4)
	for _, m := range monitorMap.Values() {
		tw.LoadWithJitter(m)
	}
	tw.Start()
	defer tw.Stop()

	// consume dispatched monitors
	go func() {
		for m := range tw.Out {
			builtTask, err := buildMonitorTask(m)
			if err != nil {
				logger.Error("failed to build task", "err", err)
				continue
			}

			logger.Info("monitor fired", "id", builtTask.GetId(), "name", m.Name, "endpoint", m.Endpoint)

			data, err := proto.Marshal(builtTask)
			if err != nil {
				logger.Error("marshal failed", "task_id", builtTask.GetId(), "err", err)
				continue
			}

			jobSlot := time.Now().Unix() / int64(dedupeInterval.Seconds())
			jobID := fmt.Sprintf("%s:%d", builtTask.GetId(), jobSlot)

			subjectPrefix := "tasks."
			var wg sync.WaitGroup
			for _, region := range regionMap.Keys() {
				wg.Go(func() {
					msg := natsgo.NewMsg(subjectPrefix + region)
					msg.Data = data
					msg.Header.Set("Nats-TTL", fmt.Sprintf("%.0ds", int(float64(m.Frequency)*0.9)))
					msg.Header.Set("Nats-Msg-Id", jobID)

					publishCtx, publishCancel := context.WithTimeout(context.Background(), time.Second*5)
					defer publishCancel()
					_, err := natsConnector.PublishMsg(publishCtx, msg)
					if err != nil {
						logger.Error("async publish failed", "task_id", builtTask.GetId(), "region", region, "err", err)
					}
				})
			}
			wg.Wait()
		}
	}()

	// block until SIGINT or SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go startMonitorResyncWorker(ctx, logger, conn)
	<-ctx.Done()
	logger.Info("shutting down", "signal", ctx.Err())
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
