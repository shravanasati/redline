package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	natsgo "github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/shravanasati/redline/services/shared/env"
	"github.com/shravanasati/redline/services/shared/logging"
	"github.com/shravanasati/redline/services/shared/natsconn"
	"github.com/shravanasati/redline/services/shared/pb/tasks"
	"google.golang.org/protobuf/proto"
)

// taskTTL is the per-message expiry set via the Nats-TTL header. For test
// publishes there is no real check frequency, so 5 minutes is used. In
// production the dispatcher should derive this as ~90% of the check interval
// so stale tasks are never executed if the queue backs up.
const taskTTL = 5 * time.Minute

// bad endpoint to exercise the failure path.
var sampleTasks = []struct {
	region string
	task   tasks.MonitorTask_builder
}{
	// DNS
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("dns-google"), Type: tasks.TaskType_TASK_TYPE_DNS.Enum(),
		Endpoint: new("dns.google"), Timeout: new(int32(5)),
	}},
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("dns-cloudflare"), Type: tasks.TaskType_TASK_TYPE_DNS.Enum(),
		Endpoint: new("one.one.one.one"), Timeout: new(int32(5)),
	}},

	// HTTP
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("http-example"), Type: tasks.TaskType_TASK_TYPE_HTTP.Enum(),
		Endpoint: new("http://example.com"), Timeout: new(int32(10)),
	}},
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("http-httpbin-post"), Type: tasks.TaskType_TASK_TYPE_HTTP.Enum(),
		Endpoint: new("http://httpbin.org/post"), Timeout: new(int32(10)),
		Metadata: tasks.MonitorMetadata_builder{
			Method:  tasks.HTTPMethod_HTTP_METHOD_POST.Enum(),
			Body:    new(`{"source":"race-control"}`),
			Headers: map[string]string{"Content-Type": "application/json"},
		}.Build(),
	}},

	// HTTPS
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("https-github"), Type: tasks.TaskType_TASK_TYPE_HTTPS.Enum(),
		Endpoint: new("https://github.com"), Timeout: new(int32(10)),
	}},
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("https-google"), Type: tasks.TaskType_TASK_TYPE_HTTPS.Enum(),
		Endpoint: new("https://www.google.com"), Timeout: new(int32(10)),
	}},

	// TCP
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("tcp-cloudflare-dns"), Type: tasks.TaskType_TASK_TYPE_TCP.Enum(),
		Endpoint: new("1.1.1.1:53"), Timeout: new(int32(5)),
	}},

	// ICMP (TCP fallback)
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("icmp-google"), Type: tasks.TaskType_TASK_TYPE_ICMP.Enum(),
		Endpoint: new("google.com"), Timeout: new(int32(5)),
	}},

	// Bad endpoint — exercises the failure path
	{"apac-south", tasks.MonitorTask_builder{
		Id: new("https-bad-host"), Type: tasks.TaskType_TASK_TYPE_HTTPS.Enum(),
		Endpoint: new("https://this-host-does-not-exist.invalid"), Timeout: new(int32(5)),
	}},
}

func main() {
	logger := logging.New(logging.Config{
		Service: "race-control",
		Level:   slog.LevelInfo,
		Format:  logging.FormatText,
	})

	if err := env.Load(logger); err != nil {
		logger.Error("failed to load .env", "err", err)
		os.Exit(1)
	}

	connector, err := natsconn.New(logger, natsconn.Config{
		URL:      envOr("NATS_URL", "nats://localhost:4222"),
		Name:     "race-control",
		Username: mustEnv(logger, "NATS_USER_DISPATCHER"),
		Password: mustEnv(logger, "NATS_PASS_DISPATCHER"),
	})
	if err != nil {
		logger.Error("failed to connect to NATS", "err", err)
		os.Exit(1)
	}
	defer connector.Drain()

	ctx := context.Background()

	if _, err := connector.EnsureStream(ctx, jetstream.StreamConfig{
		Name:        "TASKS",
		Subjects:    []string{"tasks.>"},
		Retention:   jetstream.WorkQueuePolicy,
		Discard:     jetstream.DiscardOld,
		AllowMsgTTL: true,
		MaxAge:      time.Hour,
		Storage:     jetstream.FileStorage,
		Duplicates:  2 * time.Minute,
	}); err != nil {
		logger.Error("failed to ensure TASKS stream", "err", err)
		os.Exit(1)
	}

	region := envOr("PUBLISH_REGION", "apac-south")
	subject := "tasks." + region
	published := 0

	var futures []struct {
		taskID string
		future jetstream.PubAckFuture
	}

	for _, s := range sampleTasks {
		if s.region != region {
			continue
		}
		task := s.task.Build()
		data, err := proto.Marshal(task)
		if err != nil {
			logger.Error("marshal failed", "task_id", task.GetId(), "err", err)
			continue
		}

		// Set Nats-TTL so the server discards the message if it isn't consumed
		// within taskTTL. Requires AllowMsgTTL: true on the TASKS stream.
		msg := natsgo.NewMsg(subject)
		msg.Data = data
		msg.Header.Set("Nats-TTL", fmt.Sprintf("%.0fs", taskTTL.Seconds()))

		future, err := connector.PublishMsgAsync(msg)
		if err != nil {
			logger.Error("async publish failed", "task_id", task.GetId(), "err", err)
			continue
		}

		futures = append(futures, struct {
			taskID string
			future jetstream.PubAckFuture
		}{
			taskID: task.GetId(),
			future: future,
		})

		logger.Info("submitted task async",
			"task_id", task.GetId(),
			"type", task.GetType(),
			"endpoint", task.GetEndpoint(),
		)
		published++
	}

	logger.Info("all tasks submitted, waiting for server acks...", "count", published)

	// Block until all outstanding async publications are acknowledged or errored.
	select {
	case <-connector.PublishAsyncComplete():
		logger.Info("async publish check complete")
	case <-time.After(10 * time.Second):
		logger.Error("timeout waiting for server acks")
	}

	// Verify all individual publications succeeded
	for _, f := range futures {
		select {
		case ack := <-f.future.Ok():
			logger.Info("server acked task", "task_id", f.taskID, "stream", ack.Stream, "sequence", ack.Sequence)
		case err := <-f.future.Err():
			logger.Error("failed to publish task", "task_id", f.taskID, "err", err)
		}
	}

	logger.Info("done", "published", published, "subject", subject)
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
