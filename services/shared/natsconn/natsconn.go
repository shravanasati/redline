// Package natsconn provides a NATSConnector that wraps a NATS connection and
// JetStream context with production-ready defaults. It is intended to be shared
// across all redline services so that connection options, stream management, and
// consumer provisioning are implemented once.
package natsconn

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

// Config holds the parameters required to establish a NATS connection.
type Config struct {
	// URL is the NATS server URL, e.g. "nats://localhost:4222".
	URL string

	// Name is the human-readable connection name shown in server monitoring.
	// Convention: "<service>-<region>", e.g. "grid-worker-apac-south".
	Name string

	// Username and Password are used for per-user authorization as configured
	// in nats.conf.
	Username string
	Password string
}

// NATSConnector wraps a *nats.Conn and a jetstream.JetStream context, exposing
// helpers for stream and consumer lifecycle management. All methods are safe to
// call on every service startup (idempotent via CreateOrUpdateStream /
// CreateOrUpdateConsumer).
type NATSConnector struct {
	nc     *nats.Conn
	js     jetstream.JetStream
	logger *slog.Logger
}

// New establishes a NATS connection with the following production defaults:
//   - Named connection and user/password auth
//   - 10 s connect timeout
//   - 30 s ping interval, drop after 3 missed pongs
//   - Pedantic mode (stricter server-side validation)
//   - Unlimited reconnects, 2 s wait, 8 MiB outbound buffer
//
// It then creates a JetStream context on top of the connection and returns a
// ready-to-use NATSConnector. Close or Drain must be called before exit.
func New(logger *slog.Logger, cfg Config) (*NATSConnector, error) {
	opts := []nats.Option{
		nats.Name(cfg.Name),
		nats.UserInfo(cfg.Username, cfg.Password),
		nats.Timeout(10 * time.Second),
		nats.PingInterval(30 * time.Second),
		nats.MaxPingsOutstanding(3),
		func(o *nats.Options) error { o.Pedantic = true; return nil },
		nats.MaxReconnects(-1),
		nats.ReconnectWait(2 * time.Second),
		nats.ReconnectBufSize(8 << 20), // 8 MiB
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			logger.Warn("nats: disconnected", "err", err)
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			logger.Info("nats: reconnected", "url", nc.ConnectedUrl())
		}),
		nats.ClosedHandler(func(_ *nats.Conn) {
			logger.Info("nats: connection closed")
		}),
		nats.ErrorHandler(func(_ *nats.Conn, _ *nats.Subscription, err error) {
			logger.Error("nats: async error", "err", err)
		}),
	}

	nc, err := nats.Connect(cfg.URL, opts...)
	if err != nil {
		return nil, fmt.Errorf("nats connect to %q: %w", cfg.URL, err)
	}
	logger.Info("nats: connected", "url", nc.ConnectedUrl(), "name", cfg.Name)

	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("nats jetstream context: %w", err)
	}

	return &NATSConnector{nc: nc, js: js, logger: logger}, nil
}

// EnsureStream idempotently creates or updates a JetStream stream. Safe to
// call on every startup — it is a no-op when the stream already matches cfg.
func (c *NATSConnector) EnsureStream(ctx context.Context, cfg jetstream.StreamConfig) (jetstream.Stream, error) {
	s, err := c.js.CreateOrUpdateStream(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("ensure stream %q: %w", cfg.Name, err)
	}
	c.logger.Info("nats: stream ready", "stream", cfg.Name, "subjects", cfg.Subjects)
	return s, nil
}

// EnsureConsumer idempotently creates or updates a durable consumer on the
// named stream. Safe to call on every startup.
func (c *NATSConnector) EnsureConsumer(ctx context.Context, stream string, cfg jetstream.ConsumerConfig) (jetstream.Consumer, error) {
	cons, err := c.js.CreateOrUpdateConsumer(ctx, stream, cfg)
	if err != nil {
		return nil, fmt.Errorf("ensure consumer %q on stream %q: %w", cfg.Durable, stream, err)
	}
	c.logger.Info("nats: consumer ready",
		"stream", stream,
		"consumer", cfg.Durable,
		"filter", cfg.FilterSubject,
	)
	return cons, nil
}

// Publish synchronously publishes data to subject on the JetStream context and
// waits for the server ack before returning.
func (c *NATSConnector) Publish(ctx context.Context, subject string, data []byte) (*jetstream.PubAck, error) {
	ack, err := c.js.Publish(ctx, subject, data)
	if err != nil {
		return nil, fmt.Errorf("js publish to %q: %w", subject, err)
	}
	return ack, nil
}

// PublishMsg synchronously publishes a pre-built *nats.Msg through the
// JetStream context. Use this when you need to set message headers — most
// commonly the Nats-TTL header for per-message expiry on streams that have
// AllowMsgTTL enabled:
//
//	msg := nats.NewMsg("tasks.apac-south")
//	msg.Data = data
//	msg.Header.Set("Nats-TTL", "54s") // expire after 54 s if not consumed
//	connector.PublishMsg(ctx, msg)
func (c *NATSConnector) PublishMsg(ctx context.Context, msg *nats.Msg) (*jetstream.PubAck, error) {
	ack, err := c.js.PublishMsg(ctx, msg)
	if err != nil {
		return nil, fmt.Errorf("js publish msg to %q: %w", msg.Subject, err)
	}
	return ack, nil
}

// PublishMsgAsync submits a pre-built *nats.Msg for async JetStream publish and
// returns a PubAckFuture. Call PublishAsyncComplete() to block until all
// outstanding futures have been acknowledged by the server, then inspect each
// future's Ok() / Err() channels for individual results.
func (c *NATSConnector) PublishMsgAsync(msg *nats.Msg) (jetstream.PubAckFuture, error) {
	f, err := c.js.PublishMsgAsync(msg)
	if err != nil {
		return nil, fmt.Errorf("js publish async to %q: %w", msg.Subject, err)
	}
	return f, nil
}

// PublishAsyncComplete returns a channel that is closed once all outstanding
// async publish futures have received a server ack (or errored).
func (c *NATSConnector) PublishAsyncComplete() <-chan struct{} {
	return c.js.PublishAsyncComplete()
}


// JS returns the underlying jetstream.JetStream for operations not covered by
// the NATSConnector helpers.
func (c *NATSConnector) JS() jetstream.JetStream { return c.js }

// Conn returns the underlying *nats.Conn for low-level operations.
func (c *NATSConnector) Conn() *nats.Conn { return c.nc }

// Drain gracefully flushes in-flight messages and closes the connection.
// Call via defer in main() before program exit.
func (c *NATSConnector) Drain() error {
	c.logger.Info("nats: draining connection")
	return c.nc.Drain()
}

// Close immediately closes the connection without waiting for in-flight messages.
// Prefer Drain() for graceful shutdown.
func (c *NATSConnector) Close() { c.nc.Close() }
