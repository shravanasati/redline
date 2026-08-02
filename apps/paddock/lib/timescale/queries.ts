import { and, desc, gte, sql } from "drizzle-orm";
import { timescaleDb } from "./index";
import {
  type MonitorResultSelect,
  monitorResults,
  monitorResults1m,
} from "./schema";

export type MonitorHistoryItem = MonitorResultSelect;

export type MonitorStats = {
  totalChecks: number;
  successChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
};

export type MonitorTimeSeriesItem = {
  timestamp: string;
  totalChecks: number;
  successChecks: number;
  failedChecks: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
};

export type RegionalStatsItem = {
  region: string;
  totalChecks: number;
  successChecks: number;
  failedChecks: number;
  uptimePercentage: number;
  avgLatencyMs: number;
};

/**
 * Fetch recent raw monitor results (check history logs)
 */
export async function getMonitorHistory(
  monitorId: string,
  limit = 20,
): Promise<MonitorHistoryItem[]> {
  try {
    const results = await timescaleDb
      .select()
      .from(monitorResults)
      .where(sql`${monitorResults.monitorId} = ${monitorId}`)
      .orderBy(desc(monitorResults.timestamp))
      .limit(limit);

    return results;
  } catch (error) {
    console.error("Error fetching monitor history from TimescaleDB:", error);
    return [];
  }
}

/**
 * Fetch aggregate KPI statistics over the last N hours
 */
export async function getMonitorStats(
  monitorId: string,
  hours = 24,
): Promise<MonitorStats> {
  const defaultStats: MonitorStats = {
    totalChecks: 0,
    successChecks: 0,
    failedChecks: 0,
    uptimePercentage: 100,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    minLatencyMs: 0,
    maxLatencyMs: 0,
  };

  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [aggregated] = await timescaleDb
      .select({
        total: sql<number>`COUNT(*)::int`,
        success: sql<number>`COUNT(*) FILTER (WHERE ${monitorResults.success} = TRUE)::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${monitorResults.success} = FALSE)::int`,
        avgLatency: sql<number>`COALESCE(AVG(${monitorResults.latencyMs}), 0)::float`,
        p95Latency: sql<number>`COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY ${monitorResults.latencyMs}), 0)::float`,
        minLatency: sql<number>`COALESCE(MIN(${monitorResults.latencyMs}), 0)::float`,
        maxLatency: sql<number>`COALESCE(MAX(${monitorResults.latencyMs}), 0)::float`,
      })
      .from(monitorResults)
      .where(
        and(
          sql`${monitorResults.monitorId} = ${monitorId}`,
          gte(monitorResults.timestamp, cutoff),
        ),
      );

    if (!aggregated || aggregated.total === 0) {
      return defaultStats;
    }

    const total = Number(aggregated.total || 0);
    const success = Number(aggregated.success || 0);
    const failed = Number(aggregated.failed || 0);
    const uptimePercentage =
      total > 0 ? Number(((success / total) * 100).toFixed(2)) : 100;

    return {
      totalChecks: total,
      successChecks: success,
      failedChecks: failed,
      uptimePercentage,
      avgLatencyMs: Math.round(Number(aggregated.avgLatency || 0)),
      p95LatencyMs: Math.round(Number(aggregated.p95Latency || 0)),
      minLatencyMs: Math.round(Number(aggregated.minLatency || 0)),
      maxLatencyMs: Math.round(Number(aggregated.maxLatency || 0)),
    };
  } catch (error) {
    console.error("Error fetching monitor stats from TimescaleDB:", error);
    return defaultStats;
  }
}

/**
 * Fetch time-series aggregated metrics for charting over the last N hours
 */
export async function getMonitorTimeSeries(
  monitorId: string,
  hours = 24,
): Promise<MonitorTimeSeriesItem[]> {
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Try fetching from continuous aggregate monitor_results_1m first
    const caggRows = await timescaleDb
      .select({
        bucket: monitorResults1m.bucket,
        totalChecks: sql<number>`SUM(${monitorResults1m.totalChecks})::int`,
        successChecks: sql<number>`SUM(${monitorResults1m.successChecks})::int`,
        failedChecks: sql<number>`SUM(${monitorResults1m.failedChecks})::int`,
        avgLatencyMs: sql<number>`COALESCE(AVG(${monitorResults1m.avgLatencyMs}), 0)::float`,
        p95LatencyMs: sql<number>`COALESCE(MAX(${monitorResults1m.p95LatencyMs}), 0)::float`,
      })
      .from(monitorResults1m)
      .where(
        and(
          sql`${monitorResults1m.monitorId} = ${monitorId}`,
          gte(monitorResults1m.bucket, cutoff),
        ),
      )
      .groupBy(monitorResults1m.bucket)
      .orderBy(sql`${monitorResults1m.bucket} ASC`);

    if (caggRows && caggRows.length > 0) {
      return caggRows
        .filter((row) => row.bucket != null)
        .map((row) => ({
          timestamp: new Date(row.bucket!).toISOString(),
          totalChecks: Number(row.totalChecks || 0),
          successChecks: Number(row.successChecks || 0),
          failedChecks: Number(row.failedChecks || 0),
          avgLatencyMs: Math.round(Number(row.avgLatencyMs || 0)),
          p95LatencyMs: Math.round(Number(row.p95LatencyMs || 0)),
        }));
    }

    // Fallback: Query raw hypertable using time_bucket directly if continuous agg is not populated yet
    const rawBucketRows = await timescaleDb
      .select({
        bucket: sql<Date>`time_bucket('1 minute', ${monitorResults.timestamp})`,
        totalChecks: sql<number>`COUNT(*)::int`,
        successChecks: sql<number>`COUNT(*) FILTER (WHERE ${monitorResults.success} = TRUE)::int`,
        failedChecks: sql<number>`COUNT(*) FILTER (WHERE ${monitorResults.success} = FALSE)::int`,
        avgLatencyMs: sql<number>`COALESCE(AVG(${monitorResults.latencyMs}), 0)::float`,
        p95LatencyMs: sql<number>`COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY ${monitorResults.latencyMs}), 0)::float`,
      })
      .from(monitorResults)
      .where(
        and(
          sql`${monitorResults.monitorId} = ${monitorId}`,
          gte(monitorResults.timestamp, cutoff),
        ),
      )
      .groupBy(sql`time_bucket('1 minute', ${monitorResults.timestamp})`)
      .orderBy(sql`time_bucket('1 minute', ${monitorResults.timestamp}) ASC`);

    return rawBucketRows.map((row) => ({
      timestamp: new Date(row.bucket).toISOString(),
      totalChecks: Number(row.totalChecks || 0),
      successChecks: Number(row.successChecks || 0),
      failedChecks: Number(row.failedChecks || 0),
      avgLatencyMs: Math.round(Number(row.avgLatencyMs || 0)),
      p95LatencyMs: Math.round(Number(row.p95LatencyMs || 0)),
    }));
  } catch (error) {
    console.error(
      "Error fetching monitor time series from TimescaleDB:",
      error,
    );
    return [];
  }
}

/**
 * Fetch regional breakdown stats over the last N hours
 */
export async function getMonitorRegionalStats(
  monitorId: string,
  hours = 24,
): Promise<RegionalStatsItem[]> {
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await timescaleDb
      .select({
        region: monitorResults.workerRegion,
        total: sql<number>`COUNT(*)::int`,
        success: sql<number>`COUNT(*) FILTER (WHERE ${monitorResults.success} = TRUE)::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${monitorResults.success} = FALSE)::int`,
        avgLatency: sql<number>`COALESCE(AVG(${monitorResults.latencyMs}), 0)::float`,
      })
      .from(monitorResults)
      .where(
        and(
          sql`${monitorResults.monitorId} = ${monitorId}`,
          gte(monitorResults.timestamp, cutoff),
        ),
      )
      .groupBy(monitorResults.workerRegion);

    return rows.map((row) => {
      const total = Number(row.total || 0);
      const success = Number(row.success || 0);
      const failed = Number(row.failed || 0);
      const uptimePercentage =
        total > 0 ? Number(((success / total) * 100).toFixed(2)) : 100;

      return {
        region: row.region,
        totalChecks: total,
        successChecks: success,
        failedChecks: failed,
        uptimePercentage,
        avgLatencyMs: Math.round(Number(row.avgLatency || 0)),
      };
    });
  } catch (error) {
    console.error(
      "Error fetching monitor regional stats from TimescaleDB:",
      error,
    );
    return [];
  }
}
