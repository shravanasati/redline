package main

import (
	"fmt"
	"os"
	"strconv"
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
