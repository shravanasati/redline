package main

import pgxuuid "github.com/jackc/pgx-gofrs-uuid"

// MonitorAssertion mirrors the TypeScript MonitorAssertion type.
type MonitorAssertion struct {
	Target   string `json:"target"`
	Operator string `json:"operator"`
	Value    any    `json:"value"`
}

// MonitorMetadata mirrors the TypeScript MonitorMetadata type.
type MonitorMetadata struct {
	Headers map[string]string `json:"headers,omitempty"`
	Method  string            `json:"method,omitempty"`
	Body    string            `json:"body,omitempty"`
}

// Monitor holds the fields fetched from the monitors table.
type Monitor struct {
	ID         pgxuuid.UUID
	UserID     string
	Name       string
	Type       string
	Endpoint   string
	Frequency  int
	Timeout    int
	Assertions []MonitorAssertion
	Metadata   *MonitorMetadata
	Version    int
}

func uuidToString(u pgxuuid.UUID) string {
	// ignoring error cuz it always returns false
	val, _:= u.UUIDValue()
	return val.String()
}