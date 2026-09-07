# Redline

A distributed, multi-region uptime monitoring platform.

Redline is a horizontally-scalable uptime and latency monitoring service. Users define **monitors** (HTTP/HTTPS/TCP/DNS/ICMP) from a Next.js control plane (**paddock**); a Go dispatcher (**race-control**) schedules them on a high-performance timing wheel and fans tasks out over NATS JetStream; stateless Go probers (**grid-worker**) execute checks from multiple geographic regions; and a Python service (**pit-wall**) persists every result to TimescaleDB and fires notifications (e.g. Discord webhooks) on failure.

---

## Architecture

<!-- TODO: Replace the placeholder below with a real diagram (e.g. `docs/architecture.png`) -->

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Architecture Diagram                             │
│                                                                         │
│                                                                         │
│     paddock (Next.js) ──► Postgres (app DB) ──► race-control ──► NATS  │
│                                                        │    JetStream  │
│                                         ┌──────────────┼──────────────┐ │
│                                         │  TASKS stream (tasks.<region>)│
│                                         ▼              ▼              ▼ │
│                                   grid-worker    grid-worker    grid-worker│
│                                   (us-east)      (eu-west)      (ap-southeast)│
│                                         │              │              │ │
│                                         └──────────────┼──────────────┘ │
│                                                        ▼                │
│                                              RESULTS stream             │
│                                              (results.<region>)        │
│                                                        │                │
│                                                    pit-wall ──► TimescaleDB│
│                                                        │                │
│                                                        └──► Discord / Email│
│                                                                         │
│     paddock ──monitors.events──► race-control (live config updates)     │
│     NATS KV bucket `discovery` — worker region heartbeat / presence     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Multi-protocol probes** — `HTTP`, `HTTPS`, `TCP`, `DNS`, `ICMP` (TCP fallback) with configurable timeout (1-30 s), HTTP method/headers/body, and per-monitor check frequency (10-3600 s).
- **Assertion engine** — declarative assertions on `status_code` (`equals`), `body` (`equals`/`contains`), and `response_time` (`less_than`) evaluated inside the worker; failures surface as typed error messages.
- **Multi-region, horizontally scalable workers** — each `grid-worker` registers itself in a NATS Key-Value bucket (`discovery`) with a TTL heartbeat; `race-control` watches the bucket and fans every task to `tasks.<region>` for every live region.
- **At-least-once + deduplication** — JetStream `WorkQueue` streams with `Duplicates` window (2 min), `Nats-Msg-Id` (`<monitorId>:<timeSlot>:<region>`) and `Nats-TTL` (90 % of frequency) prevent duplicate executions and stale tasks.
- **Precise scheduling** — `race-control` uses a hierarchical timing wheel (`RussellLuo/timingwheel`) with FNV-1a deterministic jitter so monitors sharing the same frequency don't thunder.
- **TimescaleDB analytics** — raw `monitor_results` hypertable + `monitor_results_1m` and `monitor_results_1h` continuous aggregates (p50/p95/p99, status-code histograms), compression after 7 days, retention after 90 days.
- **Alerting** — `pit-wall` classifies failures as `INCIDENT_OPENED` vs `LATENCY_DEGRADED`, looks up `monitor_notification_rules` and dispatches via pluggable `NotificationManager` (Discord webhook today, email scaffolded).
- **Modern control plane** — Next.js 16 + React 19 + Tailwind v4 + shadcn/ui dashboard with `better-auth` (GitHub/Google OAuth), Drizzle ORM, and real-time NATS `monitors.events` propagation.

---

## Services

| Service | Directory | Language | Role |
|---------|-----------|----------|------|
| **paddock** | `apps/paddock` | TypeScript (Next.js 16) | User-facing control plane: auth, monitor CRUD, notification channels, dashboards, Timescale reads. Publishes `monitors.events`. |
| **race-control** | `services/race-control` | Go 1.26 | Dispatcher. Loads active monitors from Postgres, drives `MonitorWheel`, builds `MonitorTask` protos, publishes to `tasks.<region>` per live region. Watches `monitors.events` + periodic DB resync. |
| **grid-worker** | `services/grid-worker` | Go 1.26 | Stateless edge prober. Pull-consumer on `tasks.<region>`, bounded worker pool (`WORKER_POOL_SIZE`, default 64), executes probes, publishes `MonitorTaskResult` to `results.<region>`. Heartbeats to `discovery` KV. |
| **pit-wall** | `services/pit-wall` | Python 3.13 | Ingest + alerting. Durable pull-consumer on `results.>`, batch-flushes (100 rows or 2 s) to TimescaleDB, classifies failures, dispatches notifications via `NotificationManager`. |
| **shared** | `services/shared` | Go | Shared Go utilities: `natsconn` (connection + JetStream helpers), `netutil` (private-IP guard), `safemap` (generic concurrent map), `logging` (slog), and generated protobuf `pb/*`. |

### Infrastructure

| Component | Image | Purpose |
|-----------|-------|---------|
| **Postgres** | `postgres:18-alpine` | App DB — `monitors`, `notification_channels`, `monitor_notification_rules`, `better-auth` tables. Port `5432`. |
| **TimescaleDB** | `timescale/timescaledb:latest-pg17` | Metrics DB — `monitor_results` hypertable + continuous aggregates. Port `5433` → `5432` inside. |
| **NATS** | `nats:2.14-alpine` | JetStream broker: streams `TASKS`/`RESULTS`, KV bucket `discovery`, subjects `monitors.events`, `tasks.>`, `results.>`. Ports `4222`/`8222` (monitoring). |

---

## Data Flow

1. User creates/updates/deletes a monitor in **paddock** → Drizzle writes to `monitors` (Postgres) → `publishMonitorUpserted` / `publishMonitorDeleted` emits a `MonitorEvent` proto on `monitors.events` (`services/shared/pb` + `apps/paddock/lib/pb`).
2. **race-control** is subscribed to `monitors.events`; it stages the `monitor_id` in `pendingMap` and every 15 s the resync worker fetches the authoritative rows (`fetchMonitorsByIDs`) and hot-loads them into `MonitorWheel` with jitter.
3. `MonitorWheel` fires per-monitor on its `frequency` cadence → `buildMonitorTask` maps DB types to proto `TaskType`/`HTTPMethod` → marshaled `MonitorTask` is published to `tasks.<region>` for **every** region in `regionMap` (with `Nats-Msg-Id` dedup key + `Nats-TTL` ≈ 0.9×frequency).
4. Each **grid-worker** pull-fetches `WORKER_POOL_SIZE` messages, bounded by a `sem` channel → `executeProbe` validates (private-IP / localhost blocked via `netutil`, timeout 0-30 s) → dispatches to `probeHTTP`/`probeHTTPS`/`probeTCP`/`probeDNS`/`probeICMP` → evaluates `checkAssertions` → publishes `MonitorTaskResult` to `results.<region>` → `Ack` (or `Term`/`Nak` on error).
5. **pit-wall** durable pull-consumer `pit-wall-results` on `results.>` fetches up to `BATCH_SIZE=100`, buffers, and every `FLUSH_INTERVAL=2s` calls `insert_monitor_results_batch` (TimescaleDB `executemany`). On `success==false` it calls `handle_probe_failure` → classifies `LATENCY_DEGRADED` vs `INCIDENT_OPENED` → joins `monitor_notification_rules × notification_channels × user × monitors` → dispatches via `DiscordNotificationChannel` (niquests) with an embed linking back to `DASHBOARD_URL/dashboard/monitors/<id>`.

---

## Probe Types

Implemented in `services/grid-worker/probes.go:119-374`:

| Type | Proto | Behavior |
|------|-------|----------|
| `HTTP` / `HTTPS` | `TASK_TYPE_HTTP` / `TASK_TYPE_HTTPS` | `sharedHTTPClient` (keep-alive, 200 idle conns) with context deadline. Records `http_status_code`, success = `2xx-3xx`. Body read only if `body` assertions exist. |
| `TCP` | `TASK_TYPE_TCP` | `net.DialTimeout("tcp", endpoint, timeout)` where `endpoint` is `host:port`. |
| `DNS` | `TASK_TYPE_DNS` | `net.Resolver` with custom `Dial` (UDP, timeout-aware) → `LookupHost`. |
| `ICMP` | `TASK_TYPE_ICMP` | TCP fallback — strips scheme/path, `net.DialTimeout("tcp", host:80, timeout)`. True ICMP requires raw sockets. |

### Assertions (`MonitorAssertion`)

| `target` | `operator` | `value` | Semantics |
|----------|------------|---------|-----------|
| `status_code` | `equals` | `number` | Fails if HTTP status ≠ expected. |
| `body` | `equals` / `contains` | `string` | Exact or substring match against response body. |
| `response_time` | `less_than` | `number` (ms) | Fails if `latency_ms >= threshold`. Maps to `LATENCY_DEGRADED` event. |

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui (radix-rhea), `better-auth`, Drizzle ORM, `recharts`, `motion`, `pnpm`.
- **Backend Go:** `nats.go` + JetStream, `jackc/pgx/v5`, `RussellLuo/timingwheel`, `google.golang.org/protobuf`, `slog`.
- **Backend Python:** `asyncpg`, `nats-py`, `protobuf`, `niquests`, `python-dotenv`, `pytest`.
- **Infra:** NATS JetStream, PostgreSQL 18, TimescaleDB (PG17), Docker Compose, Buf (protobuf), Task (taskfile.dev).

---

## Protobuf Contracts

Defined in `proto/` (edition `2024`, `buf` lint `STANDARD`):

- **`tasks.MonitorTask`** (`proto/tasks/tasks.proto:35`) — `id`, `type` (ICMP/HTTP/HTTPS/TCP/DNS), `endpoint`, `timeout`, `assertions[]`, `metadata` (headers/method/body), `user_id`.
- **`tasks.MonitorTaskResult`** (`proto/tasks/results.proto:10`) — `id`, `success`, `error_message`, `http_status_code`, `worker_region`, `timestamp`, `latency`.
- **`monitors.MonitorEvent`** (`proto/monitors/updates.proto:13`) — `event_type` (UPSERT/DELETE), `monitor_id`, `version`.

Generation (`buf.gen.yaml:5`): Go → `services/shared/pb`, Python → `services/pit-wall/pb` (only `MonitorTaskResult`), TypeScript (es) → `apps/paddock/lib/pb` (only `MonitorEvent`).

```bash
task pb-gen        # buf build + buf generate
```

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Go 1.26+, Python 3.13+ (`uv`), Node 20+ (`pnpm 11.9`), `buf` CLI, `Task` (`taskfile.dev`)

### 1. Clone & env

```bash
git clone https://github.com/shravanasati/redline.git
cd redline
cp .env.example .env  # then fill in secrets — see Environment Variables below
# also create per-service overrides if needed:
#   services/grid-worker/.env / .env.docker
#   services/race-control/.env / .env.docker
#   services/pit-wall/.env / .env.docker
#   apps/paddock/.env / .env.docker
```

### 2. Start infrastructure

```bash
task infra          # postgres + nats + timescale
# or individually:
task postgres
task nats
task timescale
```

Wait for healthchecks:

```bash
docker compose ps
docker compose logs -f nats postgres timescale
```

### 3. Database — app DB migrations

```bash
cd apps/paddock
pnpm i
pnpm drizzle-kit migrate   # or: task db-migrate  (from repo root)
# generate after schema edits:
task db-generate
```

Pit-wall creates the Timescale hypertable + continuous aggregates idempotently on startup (`services/pit-wall/timescale.py:14`).

### 4. Protobuf codegen

```bash
task pb-gen
```

### 5. Run services (local, without Docker)

```bash
# in separate terminals:
task grid-worker          # WORKER_REGION defaults from env; for multi-region:
task workers              # eu-west + us-east + ap-southeast in parallel

task race-control
task pit-wall             # uv run main.py

# control plane
task paddock              # pnpm run dev → http://localhost:3000
```

### 6. Or run everything in Docker

```bash
task docker-grid-worker
task docker-race-control
task docker-pit-wall
task up                   # docker compose up -d  (builds use compose.yml images redline/*)

# deploy variant with published images + extra region workers:
docker compose -f compose-deploy.yml up -d
```
