package main

import (
	"time"

	"github.com/RussellLuo/timingwheel"
)

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
	mw.schedule(m, d)
}

// schedule arms a one-shot timer that, when it fires, sends m on Out and
// immediately re-arms itself for the next interval.
func (mw *MonitorWheel) schedule(m Monitor, d time.Duration) {
	mw.tw.AfterFunc(d, func() {
		// Non-blocking send: drop this delivery if the consumer is behind,
		// but always re-schedule so the monitor continues to fire.
		select {
		case mw.Out <- m:
		default:
		}
		mw.schedule(m, d)
	})
}
