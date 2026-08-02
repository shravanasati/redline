"use client";

import { ActivityIcon, ClockIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MonitorTimeSeriesItem } from "@/lib/timescale/queries";

type MonitorDetailChartsProps = {
  timeSeries: MonitorTimeSeriesItem[];
};

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function MonitorDetailCharts({ timeSeries }: MonitorDetailChartsProps) {
  const formattedData = timeSeries.map((item) => ({
    ...item,
    formattedTime: formatTime(item.timestamp),
    formattedDate: formatDate(item.timestamp),
  }));

  if (formattedData.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <ActivityIcon className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium text-foreground">
            No Chart Data Available
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Monitor metrics will appear here automatically once checks start
            running in TimescaleDB.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <Tabs defaultValue="latency" className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="latency" className="gap-1.5 text-xs sm:text-sm">
              <ClockIcon className="size-3.5" />
              Latency (ms)
            </TabsTrigger>
            <TabsTrigger value="volume" className="gap-1.5 text-xs sm:text-sm">
              <ActivityIcon className="size-3.5" />
              Checks & Status
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground hidden sm:inline-block font-mono">
            Timezone: Local ({formattedData.length} data points)
          </span>
        </div>

        {/* 1. Latency Line Chart */}
        <TabsContent value="latency" className="m-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">
                Response Time Trend (Average & p95)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={formattedData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border/40"
                    />
                    <XAxis
                      dataKey="formattedTime"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      unit="ms"
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0]
                          .payload as (typeof formattedData)[0];
                        return (
                          <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md text-xs">
                            <div className="font-semibold mb-1 text-muted-foreground font-mono">
                              {data.formattedDate}
                            </div>
                            <div className="flex items-center justify-between gap-4 text-emerald-500 font-medium">
                              <span>Avg Latency:</span>
                              <span>{data.avgLatencyMs} ms</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-amber-500 font-medium">
                              <span>p95 Latency:</span>
                              <span>{data.p95LatencyMs} ms</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-muted-foreground mt-1 pt-1 border-t">
                              <span>Total Checks:</span>
                              <span>{data.totalChecks}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-muted-foreground font-medium capitalize">
                          {value === "avgLatencyMs"
                            ? "Avg Latency"
                            : "p95 Latency"}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgLatencyMs"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: "#10b981", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="p95LatencyMs"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, stroke: "#f59e0b", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Check Volume & Status Area Chart */}
        <TabsContent value="volume" className="m-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">
                Check Execution Breakdown (Success vs Failed)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={formattedData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorSuccess"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorFailed"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border/40"
                    />
                    <XAxis
                      dataKey="formattedTime"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0]
                          .payload as (typeof formattedData)[0];
                        return (
                          <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md text-xs">
                            <div className="font-semibold mb-1 text-muted-foreground font-mono">
                              {data.formattedDate}
                            </div>
                            <div className="flex items-center justify-between gap-4 text-emerald-500 font-medium">
                              <span>Successful Checks:</span>
                              <span>{data.successChecks}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-destructive font-medium">
                              <span>Failed Checks:</span>
                              <span>{data.failedChecks}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-muted-foreground mt-1 pt-1 border-t">
                              <span>Avg Latency:</span>
                              <span>{data.avgLatencyMs} ms</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-muted-foreground font-medium capitalize">
                          {value === "successChecks"
                            ? "Successful Checks"
                            : "Failed Checks"}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="successChecks"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorSuccess)"
                    />
                    <Area
                      type="monotone"
                      dataKey="failedChecks"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorFailed)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
