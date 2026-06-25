package natsconn

import (
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

const (
	TasksStreamName = "TASKS"
	ResultsStreamName   = "RESULTS"

	discoveryTTL = time.Second * 30
)

var TaskStreamConfig = jetstream.StreamConfig{
	Name:        TasksStreamName,
	Subjects:    []string{"tasks.>"},
	Retention:   jetstream.WorkQueuePolicy,
	Discard:     jetstream.DiscardOld,
	AllowMsgTTL: true,
	MaxAge:      time.Hour,
	Storage:     jetstream.FileStorage,
	Duplicates:  2 * time.Minute,
}

var ResultStreamConfig = jetstream.StreamConfig{
	Name:      ResultsStreamName,
	Subjects:  []string{"results.>"},
	Retention: jetstream.WorkQueuePolicy,
	Discard:   jetstream.DiscardOld,
	MaxAge:    24 * time.Hour,
	Storage:   jetstream.FileStorage,
}

var DiscoveryKVConfig =jetstream.KeyValueConfig{
		Bucket:         "discovery",
		TTL:            discoveryTTL,
		Storage:        jetstream.MemoryStorage,
		LimitMarkerTTL: discoveryTTL,
	}
