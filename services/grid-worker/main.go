package main

import (
	"log/slog"
	"os"

	"github.com/shravanasati/redline/services/shared/env"
	"github.com/shravanasati/redline/services/shared/logging"
	"github.com/shravanasati/redline/services/shared/pb/tasks"
	"google.golang.org/protobuf/proto"
)

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

	region, ok := os.LookupEnv("WORKER_REGION")
	if !ok || region == "" {
		logger.Error("WORKER_REGION environment variable is not set")
		os.Exit(1)
	}

	logger.Info("grid-worker starting", "region", region)

	// TODO: replace with real task dispatch from NATS.
	task := tasks.MonitorTask_builder{Id: proto.String("gre"), Type: tasks.TaskType_TASK_TYPE_DNS.Enum()}.Build()
	result := executeProbe(logger, task)
	logger.Info("probe complete", "result", result)
}
