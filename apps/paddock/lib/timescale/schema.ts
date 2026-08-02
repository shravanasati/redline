import {
  bigint,
  boolean,
  doublePrecision,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// 1. Raw Monitor Results Hypertable
export const monitorResults = pgTable(
  "monitor_results",
  {
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    monitorId: text("monitor_id").notNull(),
    success: boolean("success").notNull(),
    latencyMs: doublePrecision("latency_ms").notNull(),
    httpStatusCode: smallint("http_status_code"),
    workerRegion: varchar("worker_region", { length: 32 }).notNull(),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("idx_monitor_results_id_time").on(table.monitorId, table.timestamp),
    index("idx_monitor_results_region_time").on(
      table.workerRegion,
      table.timestamp,
    ),
  ],
);

// 2. 1-Minute Continuous Aggregate View
export const monitorResults1m = pgTable("monitor_results_1m", {
  bucket: timestamp("bucket", { withTimezone: true }),
  monitorId: text("monitor_id"),
  workerRegion: varchar("worker_region", { length: 32 }),
  totalChecks: bigint("total_checks", { mode: "number" }),
  successChecks: bigint("success_checks", { mode: "number" }),
  failedChecks: bigint("failed_checks", { mode: "number" }),
  avgLatencyMs: doublePrecision("avg_latency_ms"),
  minLatencyMs: doublePrecision("min_latency_ms"),
  maxLatencyMs: doublePrecision("max_latency_ms"),
  p95LatencyMs: doublePrecision("p95_latency_ms"),
  p99LatencyMs: doublePrecision("p99_latency_ms"),
  count2xx: bigint("count_2xx", { mode: "number" }),
  count4xx: bigint("count_4xx", { mode: "number" }),
  count5xx: bigint("count_5xx", { mode: "number" }),
  countNetErrors: bigint("count_net_errors", { mode: "number" }),
});

// 3. 1-Hour Continuous Aggregate View
export const monitorResults1h = pgTable("monitor_results_1h", {
  bucket: timestamp("bucket", { withTimezone: true }),
  monitorId: text("monitor_id"),
  totalChecks: bigint("total_checks", { mode: "number" }),
  successChecks: bigint("success_checks", { mode: "number" }),
  failedChecks: bigint("failed_checks", { mode: "number" }),
  avgLatencyMs: doublePrecision("avg_latency_ms"),
  p95LatencyMs: doublePrecision("p95_latency_ms"),
});

export type MonitorResultSelect = typeof monitorResults.$inferSelect;
export type MonitorResult1mSelect = typeof monitorResults1m.$inferSelect;
export type MonitorResult1hSelect = typeof monitorResults1h.$inferSelect;
