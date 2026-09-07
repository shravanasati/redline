package main

import (
	"encoding/binary"
	"hash/fnv"
	"sync/atomic"
	"time"

	"github.com/RussellLuo/timingwheel"
)

// WheelDrops counts timer fires dropped because Out was full.
// The wheel must never block its tick thread, so an overfull Out
// sheds load here; main.go reports this counter.
var WheelDrops atomic.Int64

// MonitorWheel wraps RussellLuo/timingwheel to provide recurring, frequency-
// based dispatch of monitors. Each monitor is scheduled as a self-rescheduling
// timer: when it fires it sends itself on Out and immediately re-arms for the
// next interval.
type MonitorWheel struct {
	tw  *timingwheel.TimingWheel
	Out chan Monitor
}

// NewMonitorWheel creates a MonitorWheel ready to be started.
//   - tick sets the timer resolution (1 s is fine for monitor frequencies
//     measured in whole seconds).
//   - wheelSize is the number of buckets; 60 gives a 1-minute base wheel with
//     automatic overflow wheels for longer durations.
//   - bufSize is the capacity of the output channel.
func NewMonitorWheel(bufSize int) *MonitorWheel {
	return &MonitorWheel{
		tw:  timingwheel.NewTimingWheel(time.Second, 60),
		Out: make(chan Monitor, bufSize),
	}
}

// Start starts the underlying timing wheel.
func (mw *MonitorWheel) Start() {
	mw.tw.Start()
}

// Stop stops the timing wheel and closes the output channel.
func (mw *MonitorWheel) Stop() {
	mw.tw.Stop()
	close(mw.Out)
}

// Load schedules m to fire repeatedly according to m.Frequency (seconds).
// Safe to call before or after Start().
func (mw *MonitorWheel) Load(m Monitor) {
	freq := m.Frequency
	if freq <= 0 {
		freq = 60
	}
	d := time.Duration(freq) * time.Second
	mw.schedule(uuidToString(m.ID), m.Version, d)
}

// LoadWithJitter schedules m like Load but delays the very first fire by a
// deterministic jitter derived from the monitor's UUID. This spreads initial
// slot assignments across [0, frequency) so that monitors with the same
// frequency do not all wake up simultaneously.
//
// The jitter is computed with FNV-1a over the raw UUID bytes, making it
// reproducible across restarts for the same monitor.
func (mw *MonitorWheel) LoadWithJitter(m Monitor) {
	freq := m.Frequency
	if freq <= 0 {
		freq = 60
	}
	d := time.Duration(freq) * time.Second

	// Derive a stable offset in [0, freq) from the monitor UUID.
	h := fnv.New64a()
	// UUID is [16]byte; write it as two uint64 words so we hash all 128 bits.
	var buf [8]byte
	binary.LittleEndian.PutUint64(buf[:], binary.LittleEndian.Uint64(m.ID[:8]))
	h.Write(buf[:])
	binary.LittleEndian.PutUint64(buf[:], binary.LittleEndian.Uint64(m.ID[8:]))
	h.Write(buf[:])
	offsetSecs := int(h.Sum64() % 60) // cap jitter within 1 minute
	jitter := time.Duration(offsetSecs) * time.Second

	// Fire once after jitter, then continue on the normal frequency cadence.
	mw.tw.AfterFunc(jitter, func() {
		mLatest, present := monitorMap.Get(uuidToString(m.ID))
		if !present || mLatest.Version != m.Version {
			return
		}

		select {
		case mw.Out <- mLatest:
		default:
			WheelDrops.Add(1)
		}
		mw.schedule(uuidToString(m.ID), m.Version, d)
	})
}

// schedule arms a one-shot timer that, when it fires, pulls the latest state of the monitor,
// sends it on Out (if active and not obsolete), and immediately re-arms itself.
func (mw *MonitorWheel) schedule(monitorID string, scheduledVersion int, d time.Duration) {
	mw.tw.AfterFunc(d, func() {
		m, present := monitorMap.Get(monitorID)
		if !present {
			// Monitor has been deleted, stop rescheduling
			return
		}
		if m.Version != scheduledVersion {
			// A newer timer chain was started, stop rescheduling this obsolete one
			return
		}

		// Non-blocking send: the wheel tick thread must never block, so
		// drop this delivery if the consumer is behind (counted in
		// WheelDrops), but always re-schedule so the monitor keeps firing.
		select {
		case mw.Out <- m:
		default:
			WheelDrops.Add(1)
		}

		freq := m.Frequency
		if freq <= 0 {
			freq = 60
		}
		newD := time.Duration(freq) * time.Second
		mw.schedule(monitorID, scheduledVersion, newD)
	})
}
