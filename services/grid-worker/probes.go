package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/shravanasati/redline/services/shared/pb/tasks"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// newFailResult constructs a failure MonitorTaskResult with the given task ID and error message.
func newFailResult(id, errMsg string, latency time.Duration) *tasks.MonitorTaskResult {
	return tasks.MonitorTaskResult_builder{
		Id:           &id,
		Success:      new(false),
		ErrorMessage: &errMsg,
		Timestamp:    timestamppb.Now(),
		Latency:      durationpb.New(latency),
	}.Build()
}

// newSuccessResult constructs a success MonitorTaskResult.
func newSuccessResult(id string, latency time.Duration) *tasks.MonitorTaskResult {
	return tasks.MonitorTaskResult_builder{
		Id:        &id,
		Success:   new(true),
		Timestamp: timestamppb.Now(),
		Latency:   durationpb.New(latency),
	}.Build()
}


// probeDNS resolves the endpoint as a hostname and measures the latency.
func probeDNS(task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	id := task.GetId()
	host := task.GetEndpoint()

	timeout := time.Duration(task.GetTimeout()) * time.Second

	// Use a custom resolver so the configured timeout is respected when
	// dialling the DNS server.
	r := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{Timeout: timeout}
			return d.DialContext(ctx, "udp", address)
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	start := time.Now()
	addrs, err := r.LookupHost(ctx, host)
	latency := time.Since(start)

	if err != nil {
		msg := fmt.Sprintf("dns lookup failed for %q: %v", host, err)
		return newFailResult(id, msg, latency)
	}
	if len(addrs) == 0 {
		msg := fmt.Sprintf("dns lookup returned no addresses for %q", host)
		return newFailResult(id, msg, latency)
	}

	return newSuccessResult(id, latency)
}


// probeHTTP performs an HTTP request and measures latency.
func probeHTTP(task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	return probeHTTPOrHTTPS(task)
}

// probeHTTPS performs an HTTPS request and measures latency.
func probeHTTPS(task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	return probeHTTPOrHTTPS(task)
}

// probeHTTPOrHTTPS is the shared implementation for HTTP and HTTPS probes.
func probeHTTPOrHTTPS(task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	id := task.GetId()
	endpoint := task.GetEndpoint()

	timeout := time.Duration(task.GetTimeout()) * time.Second
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	meta := task.GetMetadata()
	method := http.MethodGet
	var body *strings.Reader

	if meta != nil {
		switch meta.GetMethod() {
		case tasks.HTTPMethod_HTTP_METHOD_POST:
			method = http.MethodPost
		case tasks.HTTPMethod_HTTP_METHOD_HEAD:
			method = http.MethodHead
		default:
			method = http.MethodGet
		}

		if meta.GetBody() != "" {
			body = strings.NewReader(meta.GetBody())
		}
	}

	var reqBody *strings.Reader
	if body != nil {
		reqBody = body
	}

	var req *http.Request
	var err error
	if reqBody != nil {
		req, err = http.NewRequest(method, endpoint, reqBody)
	} else {
		req, err = http.NewRequest(method, endpoint, nil)
	}
	if err != nil {
		msg := fmt.Sprintf("failed to build request: %v", err)
		return newFailResult(id, msg, 0)
	}

	if meta != nil {
		for k, v := range meta.GetHeaders() {
			req.Header.Set(k, v)
		}
	}

	client := &http.Client{Timeout: timeout}
	start := time.Now()
	resp, err := client.Do(req)
	latency := time.Since(start)

	if err != nil {
		msg := fmt.Sprintf("http request failed: %v", err)
		return newFailResult(id, msg, latency)
	}
	defer resp.Body.Close()

	statusCode := int32(resp.StatusCode)
	success := resp.StatusCode >= 200 && resp.StatusCode < 400

	result := tasks.MonitorTaskResult_builder{
		Id:             &id,
		Success:        &success,
		HttpStatusCode: statusCode,
		Timestamp:      timestamppb.Now(),
		Latency:        durationpb.New(latency),
	}

	if !success {
		msg := fmt.Sprintf("unexpected HTTP status: %s", resp.Status)
		result.ErrorMessage = &msg
	}

	return result.Build()
}

// probeICMP performs a TCP-based connectivity check as an ICMP substitute.
// True ICMP (ping) requires raw sockets and elevated privileges; this probe
// instead opens a TCP connection to port 80 of the host to verify reachability.
func probeICMP(task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	id := task.GetId()
	host := task.GetEndpoint()

	timeout := time.Duration(task.GetTimeout()) * time.Second
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	// Strip any scheme prefix that may be present.
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimPrefix(host, "https://")
	// Strip path.
	if idx := strings.Index(host, "/"); idx != -1 {
		host = host[:idx]
	}

	address := net.JoinHostPort(host, "80")
	start := time.Now()
	conn, err := net.DialTimeout("tcp", address, timeout)
	latency := time.Since(start)

	if err != nil {
		msg := fmt.Sprintf("icmp probe (tcp fallback) failed for %q: %v", host, err)
		return newFailResult(id, msg, latency)
	}
	conn.Close()

	return newSuccessResult(id, latency)
}

// probeTCP opens a TCP connection to the endpoint (host:port) and measures latency.
func probeTCP(task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	id := task.GetId()
	endpoint := task.GetEndpoint()

	timeout := time.Duration(task.GetTimeout()) * time.Second
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	start := time.Now()
	conn, err := net.DialTimeout("tcp", endpoint, timeout)
	latency := time.Since(start)

	if err != nil {
		msg := fmt.Sprintf("tcp connection to %q failed: %v", endpoint, err)
		return newFailResult(id, msg, latency)
	}
	conn.Close()

	return newSuccessResult(id, latency)
}


const (
	minTimeoutSecs int32 = 0
	maxTimeoutSecs int32 = 30 // 30 seconds
)

// validateTask checks that the task fields are within acceptable bounds.
// It returns a non-nil *tasks.MonitorTaskResult only when validation fails.
func validateTask(logger *slog.Logger, task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	timeoutSecs := task.GetTimeout()
	if timeoutSecs < minTimeoutSecs || timeoutSecs > maxTimeoutSecs {
		id := task.GetId()
		msg := fmt.Sprintf(
			"invalid timeout %ds: must be between %d and %ds",
			timeoutSecs, minTimeoutSecs, maxTimeoutSecs,
		)
		logger.Warn("task validation failed", "task_id", id, "timeout_secs", timeoutSecs)
		return newFailResult(id, msg, 0)
	}
	return nil
}


// executeProbe validates the task and then dispatches to the appropriate probe function.
func executeProbe(logger *slog.Logger, task *tasks.MonitorTask) *tasks.MonitorTaskResult {
	if result := validateTask(logger, task); result != nil {
		return result
	}

	logger.Info("executing probe", "task_id", task.GetId(), "type", task.GetType())

	switch task.GetType() {
	case tasks.TaskType_TASK_TYPE_DNS:
		return probeDNS(task)
	case tasks.TaskType_TASK_TYPE_HTTP:
		return probeHTTP(task)
	case tasks.TaskType_TASK_TYPE_HTTPS:
		return probeHTTPS(task)
	case tasks.TaskType_TASK_TYPE_ICMP:
		return probeICMP(task)
	case tasks.TaskType_TASK_TYPE_TCP:
		return probeTCP(task)
	default:
		id := task.GetId()
		msg := fmt.Sprintf("unknown task type: %v", task.GetType())
		logger.Error("unknown task type", "task_id", id, "type", task.GetType())
		return newFailResult(id, msg, 0)
	}
}
