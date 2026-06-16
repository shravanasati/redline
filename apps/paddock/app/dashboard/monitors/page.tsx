import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { fetchMonitorsByUser } from "@/lib/actions/monitors";
import Unauthorized from "@/components/unauthorized";
import { MonitorsPageHeader } from "@/components/dashboard/monitors/monitors-page-header";
import { MonitorsKpiCards } from "@/components/dashboard/monitors/monitors-kpi-cards";
import { MonitorsTableCard } from "@/components/dashboard/monitors/monitors-table-card";

export default async function MonitorsPage() {
  const session = await getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return <Unauthorized />;
  }

  const result = await fetchMonitorsByUser(session.user.id);
  const monitors = result.success && result.data ? result.data : [];

  // KPI calculations
  const total = monitors.length;
  const active = monitors.filter((m) => m.status === "active").length;
  const paused = monitors.filter((m) => m.status === "paused").length;
  const draft = monitors.filter((m) => m.status === "draft").length;
  const failing = monitors.filter((m) => m.isFailing).length;
  const healthy = active - failing;
  const uptimePercent = active > 0 ? Math.round((healthy / active) * 100) : 100;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <MonitorsPageHeader />
          <MonitorsKpiCards
            total={total}
            active={active}
            paused={paused}
            draft={draft}
            failing={failing}
            healthy={healthy}
            uptimePercent={uptimePercent}
          />
          <MonitorsTableCard monitors={monitors} />
        </div>
      </div>
    </div>
  );
}