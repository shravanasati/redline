// Package logging provides a shared, opinionated logger built on top of the
// standard library's log/slog package.
//
// Usage:
//
//	logger := logging.New(logging.Config{
//	    Service: "grid-worker",
//	    Level:   slog.LevelInfo,
//	    Format:  logging.FormatJSON,
//	})
//	logger.Info("worker started", "region", region)
package logging

import (
	"io"
	"log/slog"
	"os"
)

// Format controls the output format of log records.
type Format string

const (
	// FormatJSON emits newline-delimited JSON records — best for production.
	FormatJSON Format = "json"

	// FormatText emits human-readable key=value records — best for local dev.
	FormatText Format = "text"
)

// Config holds all knobs for constructing a Logger.
type Config struct {
	// Service is included as a "service" attribute on every log record.
	Service string

	// Level is the minimum log level that will be emitted.
	// Defaults to slog.LevelInfo when zero-valued.
	Level slog.Level

	// Format selects the output format. Defaults to FormatText.
	Format Format

	// Output is where log records are written. Defaults to os.Stderr.
	Output io.Writer
}

// New constructs a *slog.Logger from the given Config.
// The returned logger has the "service" attribute pre-set so every record
// produced by it is already tagged with the service name.
func New(cfg Config) *slog.Logger {
	if cfg.Output == nil {
		cfg.Output = os.Stderr
	}

	if cfg.Format == "" {
		cfg.Format = FormatText
	}

	opts := &slog.HandlerOptions{
		Level: cfg.Level,
	}

	var handler slog.Handler
	switch cfg.Format {
	case FormatJSON:
		handler = slog.NewJSONHandler(cfg.Output, opts)
	default:
		handler = slog.NewTextHandler(cfg.Output, opts)
	}

	logger := slog.New(handler)

	if cfg.Service != "" {
		logger = logger.With("service", cfg.Service)
	}

	return logger
}

// Default returns a ready-to-use text logger at Info level writing to stderr.
// It is a convenience helper for quick setups; prefer New for production code.
func Default(service string) *slog.Logger {
	return New(Config{
		Service: service,
		Level:   slog.LevelInfo,
		Format:  FormatText,
		Output:  os.Stderr,
	})
}
