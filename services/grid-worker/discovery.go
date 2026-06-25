package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

var pingbyte = []byte("ping")

func heartbeat(ctx context.Context, logger *slog.Logger, kvStore jetstream.KeyValue, region string) {
	ticker := time.NewTicker(time.Second * 10)
	for {
		select {
		case <-ctx.Done():
			logger.Info("stopping heartbeat")
			ticker.Stop()
			return
		case <-ticker.C:
			_, err := kvStore.Put(ctx, "regions."+region, pingbyte)
			if err != nil {
				logger.Error("failed to send heartbeat", "err", err)
			} else {
				logger.Debug("heart beat")
			}
		}
	}
}
