import {
  ActivityIcon,
  AlertTriangleIcon,
  ClockIcon,
  GaugeIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MonitorStats } from "@/lib/timescale/queries";

type MonitorDetailKpiProps = {
  stats: MonitorStats;
};

export function MonitorDetailKpi({ stats }: MonitorDetailKpiProps) {
  const {
    totalChecks,
    successChecks,
    failedChecks,
    uptimePercentage,
    avgLatencyMs,
    p95LatencyMs,
  } = stats;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      {/* 1. Uptime Percentage */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <TrendingUpIcon className="size-3.5 text-muted-foreground" />
            Uptime (24h)
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {uptimePercentage}%
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={
                uptimePercentage === 100
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : uptimePercentage >= 95
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
              }
            >
              {uptimePercentage === 100
                ? "100% Operational"
                : uptimePercentage >= 95
                  ? "Minor Degraded"
                  : "Critical Outage"}
            </Badge>
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          {successChecks} of {totalChecks} checks successful
        </div>
      </Card>

      {/* 2. Avg Latency */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ClockIcon className="size-3.5 text-muted-foreground" />
            Avg Latency
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {avgLatencyMs}{" "}
            <span className="text-base font-normal text-muted-foreground">
              ms
            </span>
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={
                avgLatencyMs < 200
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : avgLatencyMs < 500
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
              }
            >
              {avgLatencyMs < 200
                ? "Fast"
                : avgLatencyMs < 500
                  ? "Moderate"
                  : "Slow"}
            </Badge>
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          Min: {stats.minLatencyMs}ms · Max: {stats.maxLatencyMs}ms
        </div>
      </Card>

      {/* 3. P95 Latency */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <GaugeIcon className="size-3.5 text-muted-foreground" />
            p95 Response Time
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {p95LatencyMs}{" "}
            <span className="text-base font-normal text-muted-foreground">
              ms
            </span>
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="font-mono text-xs">
              95th Percentile
            </Badge>
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          95% of requests completed faster
        </div>
      </Card>

      {/* 4. Total Checks & Incidents */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ActivityIcon className="size-3.5 text-muted-foreground" />
            Total Executions
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {totalChecks}
          </CardTitle>
          <CardAction>
            {failedChecks === 0 ? (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                0 Incidents
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-destructive/40 bg-destructive/10 text-destructive"
              >
                <AlertTriangleIcon className="size-3" />
                {failedChecks} Failed
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          {failedChecks === 0
            ? "No failed checks recorded"
            : `${failedChecks} check failure${failedChecks === 1 ? "" : "s"} in last 24h`}
        </div>
      </Card>
    </div>
  );
}
