import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  ServerIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonitorHistoryItem } from "@/lib/timescale/queries";

type MonitorDetailHistoryProps = {
  history: MonitorHistoryItem[];
};

function formatTimestamp(d: Date | string): string {
  try {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    return dateObj.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function StatusBadge({
  success,
  httpStatus,
}: {
  success: boolean;
  httpStatus: number | null;
}) {
  if (success) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        <CheckCircle2Icon className="size-3" />
        {httpStatus ? `HTTP ${httpStatus}` : "Success"}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-destructive/40 bg-destructive/10 text-destructive"
    >
      <AlertCircleIcon className="size-3" />
      {httpStatus ? `HTTP ${httpStatus}` : "Failed"}
    </Badge>
  );
}

export function MonitorDetailHistory({ history }: MonitorDetailHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ClockIcon className="size-4 text-muted-foreground" />
              Check Executions History
            </CardTitle>
            <CardDescription>
              Raw audit logs of individual check runs executed by edge workers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-sm text-muted-foreground">
              No check logs found in TimescaleDB for this monitor.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            Check Executions History
          </CardTitle>
          <CardDescription>
            Recent individual check runs logged in TimescaleDB (showing last{" "}
            {history.length} checks).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Details / Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item, idx) => (
                <TableRow key={`${item.timestamp}-${idx}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(item.timestamp)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      success={item.success}
                      httpStatus={item.httpStatusCode}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {Math.round(item.latencyMs)} ms
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <ServerIcon className="size-3" />
                      {item.workerRegion}
                    </span>
                  </TableCell>
                  <TableCell className="text-right max-w-xs">
                    {item.errorMessage ? (
                      <span
                        className="truncate block font-mono text-xs text-destructive"
                        title={item.errorMessage}
                      >
                        {item.errorMessage}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
