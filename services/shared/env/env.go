// Package env provides helpers for loading environment variables from .env
// files using godotenv.
//
// The loader is intentionally lenient: it walks a list of candidate paths and
// silently skips any file that does not exist, matching standard twelve-factor
// app behaviour where .env files are only present in development.
package env

import (
	"errors"
	"fmt"
	"log/slog"
	"os"

	"github.com/joho/godotenv"
)

// DefaultPaths is the ordered list of .env file locations the loader tries
// when the caller does not supply an explicit list.  The first file that
// exists wins; the rest are skipped.
var DefaultPaths = []string{
	".env",
	// "../.env",
	// "../../.env",
}

// Load reads the first .env file found in paths into the process environment.
// Already-set variables are NOT overwritten (godotenv's default behaviour).
// If logger is non-nil, a debug message is emitted on success.
// Passing an empty paths slice falls back to DefaultPaths.
func Load(logger *slog.Logger, paths ...string) error {
	if len(paths) == 0 {
		paths = DefaultPaths
	}

	for _, p := range paths {
		if _, err := os.Stat(p); errors.Is(err, os.ErrNotExist) {
			continue
		}

		if err := godotenv.Load(p); err != nil {
			return fmt.Errorf("env: failed to load %q: %w", p, err)
		}

		if logger != nil {
			logger.Debug("loaded .env file", "path", p)
		}
		return nil
	}

	// No file found — not an error; rely on the real environment.
	if logger != nil {
		logger.Debug("no .env file found, relying on environment")
	}
	return nil
}
