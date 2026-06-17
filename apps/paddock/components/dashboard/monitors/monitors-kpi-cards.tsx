import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
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

type MonitorsKpiCardsProps = {
  total: number;
  active: number;
  paused: number;
  draft: number;
  failing: number;
  healthy: number;
  uptimePercent: number;
};

export function MonitorsKpiCards({
  total,
  active,
  paused,
  draft,
  failing,
  healthy,
  uptimePercent,
}: MonitorsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      {/* Total Monitors */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <ActivityIcon className="size-3.5 text-muted-foreground" />
            Total Monitors
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {total}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">{active} active</Badge>
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          {paused > 0 ? (
            <span>
              {paused} paused · {draft} draft
            </span>
          ) : (
            <span>All monitors configured</span>
          )}
        </div>
      </Card>

      {/* Uptime Rate */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <TrendingUpIcon className="size-3.5 text-muted-foreground" />
            Uptime Rate
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {uptimePercent}%
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={
                uptimePercent === 100
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : uptimePercent >= 90
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
              }
            >
              {uptimePercent === 100
                ? "All systems go"
                : uptimePercent >= 90
                  ? "Degraded"
                  : "Critical"}
            </Badge>
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          {healthy} of {active} active monitors healthy
        </div>
      </Card>

      {/* Failing Monitors */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <AlertTriangleIcon className="size-3.5 text-muted-foreground" />
            Failing Monitors
          </CardDescription>
          <CardTitle
            className={`text-3xl font-semibold tabular-nums ${failing > 0 ? "text-destructive" : ""}`}
          >
            {failing}
          </CardTitle>
          <CardAction>
            {failing === 0 ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2Icon className="size-3" />
                All clear
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/10 text-destructive"
              >
                Needs attention
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <div className="px-5 pb-5 text-sm text-muted-foreground">
          {failing === 0
            ? "No incidents detected"
            : `${failing} monitor${failing === 1 ? "" : "s"} currently failing`}
        </div>
      </Card>
    </div>
  );
}
