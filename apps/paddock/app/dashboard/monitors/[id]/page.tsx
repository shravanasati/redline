import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MonitorDetailCharts } from "@/components/dashboard/monitors/detail/monitor-detail-charts";
import { MonitorDetailHeader } from "@/components/dashboard/monitors/detail/monitor-detail-header";
import { MonitorDetailHistory } from "@/components/dashboard/monitors/detail/monitor-detail-history";
import { MonitorDetailKpi } from "@/components/dashboard/monitors/detail/monitor-detail-kpi";
import { MonitorDetailRegional } from "@/components/dashboard/monitors/detail/monitor-detail-regional";
import Unauthenticated from "@/components/unauthorized";
import { getSession } from "@/lib/auth";
import { getMonitorById } from "@/lib/db/crud/monitors";
import { getNotificationChannelsByUserId } from "@/lib/db/crud/notifications";
import {
  getMonitorHistory,
  getMonitorRegionalStats,
  getMonitorStats,
  getMonitorTimeSeries,
} from "@/lib/timescale/queries";

export default async function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return <Unauthenticated />;
  }

  const { id } = await params;

  const [monitor, channels] = await Promise.all([
    getMonitorById(id),
    getNotificationChannelsByUserId(session.user.id),
  ]);

  if (!monitor) {
    notFound();
  }

  // Fetch TimescaleDB metrics in parallel
  const [stats, timeSeries, regionalStats, history] = await Promise.all([
    getMonitorStats(id, 24),
    getMonitorTimeSeries(id, 24),
    getMonitorRegionalStats(id, 24),
    getMonitorHistory(id, 20),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 py-4 md:py-6">
        {/* Monitor Header */}
        <MonitorDetailHeader monitor={monitor} channels={channels} />

        {/* Top KPI Cards */}
        <MonitorDetailKpi stats={stats} />

        {/* Latency & Availability Charts */}
        <MonitorDetailCharts timeSeries={timeSeries} />

        {/* Regional Breakdown & Check History */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MonitorDetailRegional regionalStats={regionalStats} />
          <MonitorDetailHistory history={history} />
        </div>
      </div>
    </div>
  );
}
