package main

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nats-io/nats.go"
	"github.com/shravanasati/redline/services/shared/pb/monitors"
	"google.golang.org/protobuf/proto"
)

type PendingUpdate struct {
	Version int
}

var (
	pendingMu  sync.Mutex
	pendingMap = make(map[string]PendingUpdate)
)

func addToPending(monitorID string, version int) {
	pendingMu.Lock()
	defer pendingMu.Unlock()

	if existing, ok := pendingMap[monitorID]; !ok || version > existing.Version {
		pendingMap[monitorID] = PendingUpdate{Version: version}
	}
}

func removeFromPending(monitorID string) {
	pendingMu.Lock()
	defer pendingMu.Unlock()

	delete(pendingMap, monitorID)
}

func handleMonitorEvent(logger *slog.Logger, msg *nats.Msg) {
	var event monitors.MonitorEvent
	if err := proto.Unmarshal(msg.Data, &event); err != nil {
		logger.Error("malformed event proto; terminating message",
			"subject", msg.Subject, "err", err)
		return
	}

	monitorID := event.GetMonitorId()

	cached, present := monitorMap.Get(monitorID)
	if !present {
		logger.Info("received new monitor event", "id", monitorID)
		addToPending(monitorID, int(event.GetVersion()))
		return
	}

	if cached.Version > int(event.GetVersion()) {
		// discard
		logger.Info("discarding stale monitor data", "id", monitorID)
		return
	}

	eventType := event.GetEventType()
	if eventType == monitors.EventType_EVENT_TYPE_DELETE {
		count := monitorMap.Remove(monitorID)
		logger.Info("received delete monitor event", "id", monitorID, "count", count)
		removeFromPending(monitorID)
		return
	}

	if eventType == monitors.EventType_EVENT_TYPE_UPSERT {
		logger.Info("received upsert monitor event", "id", monitorID)
		addToPending(monitorID, int(event.GetVersion()))
	}
}

func startMonitorResyncWorker(ctx context.Context, logger *slog.Logger, conn *pgx.Conn) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			processPendingUpdates(ctx, conn, logger)
		}
	}
}

func processPendingUpdates(ctx context.Context, conn *pgx.Conn, logger *slog.Logger) {
	pendingMu.Lock()
	if len(pendingMap) == 0 {
		pendingMu.Unlock()
		return
	}

	inFlight := make(map[string]PendingUpdate, len(pendingMap))
	ids := make([]string, 0, len(pendingMap))
	for id, update := range pendingMap {
		inFlight[id] = update
		ids = append(ids, id)
	}
	pendingMu.Unlock()

	monitors, err := fetchMonitorsByIDs(ctx, conn, ids)
	if err != nil {
		logger.Error("failed to fetch monitors from DB", "err", err)
		return
	}

	pendingMu.Lock()
	defer pendingMu.Unlock()

	fetchedIDs := make(map[string]bool)
	for _, m := range monitors {
		mID := uuidToString(m.ID)
		fetchedIDs[mID] = true

		if _, exists := pendingMap[mID]; !exists {
			logger.Info("discarding fetched monitor: removed while query was in flight", "id", mID)
			continue
		}

		cached, present := monitorMap.Get(mID)
		if !present || m.Version >= cached.Version {
			monitorMap.Set(mID, m)
			if !present && tw != nil {
				tw.LoadWithJitter(m)
			}
		}

		if pending, ok := pendingMap[mID]; ok && m.Version >= pending.Version {
			delete(pendingMap, mID)
		}
	}

	for mID := range inFlight {
		if !fetchedIDs[mID] {
			if _, exists := pendingMap[mID]; exists {
				monitorMap.Remove(mID)
				delete(pendingMap, mID)
			}
		}
	}
}