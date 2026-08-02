import { GlobeIcon, ServerIcon } from "lucide-react";
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
import type { RegionalStatsItem } from "@/lib/timescale/queries";

type MonitorDetailRegionalProps = {
  regionalStats: RegionalStatsItem[];
};

export function MonitorDetailRegional({
  regionalStats,
}: MonitorDetailRegionalProps) {
  if (regionalStats.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <GlobeIcon className="size-4 text-muted-foreground" />
              Regional Performance
            </CardTitle>
            <CardDescription>
              Breakdown of response times and availability across worker
              regions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-sm text-muted-foreground">
              No regional stats recorded yet.
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
            <GlobeIcon className="size-4 text-muted-foreground" />
            Regional Performance
          </CardTitle>
          <CardDescription>
            Latency and uptime metrics collected per edge worker location.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker Region</TableHead>
                <TableHead>Uptime Rate</TableHead>
                <TableHead>Avg Latency</TableHead>
                <TableHead className="text-right">Total Checks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionalStats.map((item) => (
                <TableRow key={item.region}>
                  <TableCell className="font-medium font-mono text-xs flex items-center gap-2">
                    <ServerIcon className="size-3.5 text-muted-foreground" />
                    {item.region}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.uptimePercentage === 100
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : item.uptimePercentage >= 95
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                      }
                    >
                      {item.uptimePercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.avgLatencyMs} ms
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {item.totalChecks} ({item.successChecks} OK /{" "}
                    {item.failedChecks} Fail)
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
