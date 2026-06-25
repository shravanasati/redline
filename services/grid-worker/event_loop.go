package main

import (
	"context"
	"errors"
	"log/slog"
	"sync"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/shravanasati/redline/services/shared/natsconn"
	"github.com/shravanasati/redline/services/shared/pb/tasks"
	"google.golang.org/protobuf/proto"
)

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