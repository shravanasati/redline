package main

import (
	"context"
	"log/slog"
	"strings"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/shravanasati/redline/services/shared/regionlist"
)

func workerWatcher(ctx context.Context, logger *slog.Logger, kv jetstream.KeyValue) {
	watcher, err := kv.WatchAll(ctx)
	if err != nil {
		logger.Error("unable to watch discovery bucket", "err", err)
		return
	}

	defer watcher.Stop()
	regionList := regionlist.NewRegionList()

	for entry := range watcher.Updates() {
		if entry == nil {
			continue
		}

		op := entry.Operation()
		region := strings.TrimPrefix(entry.Key(), "regions.")

		switch op {
		case jetstream.KeyValuePut:
			added, count := regionList.Add(region)
			if added {
				logger.Info("new region added for monitoring", "region", region, "count", count)
			}
		case jetstream.KeyValueDelete, jetstream.KeyValuePurge:
			count := regionList.Remove(region)
			logger.Warn("region removed from monitoring", "region", region, "count", count)
		}
	}
}
