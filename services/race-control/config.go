package main

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/shravanasati/redline/services/shared/env"
)


type dispatcherConfig struct {
	NATSURL        string
	NATSUsername   string
	NatsPassword   string
	PostgresURL    string
	PublishRegions []string
}

func envOr(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func mustEnv(logger *slog.Logger, key string) string {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		logger.Error("required environment variable not set", "key", key)
		os.Exit(1)
	}
	return v
}

func configFromEnv(logger *slog.Logger) (*dispatcherConfig, error) {
	if err := env.Load(logger); err != nil {
		logger.Error("failed to load .env", "err", err)
		return nil, fmt.Errorf("failed to load .env: %v", err)
	}

	return &dispatcherConfig{
		NATSURL:        envOr("NATS_URL", "nats://localhost:4222"),
		NATSUsername:   mustEnv(logger, "NATS_USER_DISPATCHER"),
		NatsPassword:   mustEnv(logger, "NATS_PASS_DISPATCHER"),
		PostgresURL:    mustEnv(logger, "POSTGRES_URL"),
		PublishRegions: strings.Split(mustEnv(logger, "PUBLISH_REGIONS"), ","),
	}, nil
}
