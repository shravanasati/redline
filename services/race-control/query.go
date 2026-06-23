package main

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

// fetchActiveMonitors queries the monitors table for all active monitors.
func fetchActiveMonitors(ctx context.Context, conn *pgx.Conn) ([]Monitor, error) {
	rows, err := conn.Query(ctx, `
		SELECT id, user_id, name, type, endpoint, frequency, timeout, assertions, metadata
		FROM monitors
		WHERE status = 'active'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var monitors []Monitor
	for rows.Next() {
		var m Monitor
		// pgx scans JSONB columns as []byte; we unmarshal afterwards.
		var assertionsRaw []byte
		var metadataRaw []byte
		if err := rows.Scan(
			&m.ID, &m.UserID, &m.Name, &m.Type, &m.Endpoint,
			&m.Frequency, &m.Timeout,
			&assertionsRaw, &metadataRaw,
		); err != nil {
			return nil, err
		}
		if assertionsRaw != nil {
			if err := json.Unmarshal(assertionsRaw, &m.Assertions); err != nil {
				return nil, err
			}
		}
		if metadataRaw != nil {
			m.Metadata = &MonitorMetadata{}
			if err := json.Unmarshal(metadataRaw, m.Metadata); err != nil {
				return nil, err
			}
		}
		monitors = append(monitors, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return monitors, nil
}
