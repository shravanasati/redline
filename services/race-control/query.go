package main

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

// fetchActiveMonitors queries the monitors table for all active monitors.
func fetchActiveMonitors(ctx context.Context, conn *pgx.Conn) error {
	rows, err := conn.Query(ctx, `
		SELECT id, user_id, name, type, endpoint, frequency, timeout, assertions, metadata, version
		FROM monitors
		WHERE status = 'active'
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var m Monitor
		// pgx scans JSONB columns as []byte; we unmarshal afterwards.
		var assertionsRaw []byte
		var metadataRaw []byte
		if err := rows.Scan(
			&m.ID, &m.UserID, &m.Name, &m.Type, &m.Endpoint,
			&m.Frequency, &m.Timeout,
			&assertionsRaw, &metadataRaw, &m.Version,
		); err != nil {
			return err
		}
		if assertionsRaw != nil {
			if err := json.Unmarshal(assertionsRaw, &m.Assertions); err != nil {
				return err
			}
		}
		if metadataRaw != nil {
			m.Metadata = &MonitorMetadata{}
			if err := json.Unmarshal(metadataRaw, m.Metadata); err != nil {
				return err
			}
		}
		monitorMap.Set(uuidToString(m.ID), m)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

// fetchMonitorsByIDs queries the monitors table for the given monitor IDs.
func fetchMonitorsByIDs(ctx context.Context, conn *pgx.Conn, ids []string) ([]Monitor, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := conn.Query(ctx, `
		SELECT id, user_id, name, type, endpoint, frequency, timeout, assertions, metadata, version
		FROM monitors
		WHERE id = ANY($1::uuid[]) AND status = 'active'
	`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var monitors []Monitor
	for rows.Next() {
		var m Monitor
		var assertionsRaw []byte
		var metadataRaw []byte
		if err := rows.Scan(
			&m.ID, &m.UserID, &m.Name, &m.Type, &m.Endpoint,
			&m.Frequency, &m.Timeout,
			&assertionsRaw, &metadataRaw, &m.Version,
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

