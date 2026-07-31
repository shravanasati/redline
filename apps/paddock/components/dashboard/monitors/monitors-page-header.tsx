import { MonitorFormModal } from "@/components/dashboard/monitors/monitor-form-modal";
import type { NotificationChannel } from "@/lib/db/crud/notifications";

type MonitorsPageHeaderProps = {
  channels?: NotificationChannel[];
};

export function MonitorsPageHeader({ channels }: MonitorsPageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Monitors</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track the uptime and performance of your endpoints.
        </p>
      </div>
      <MonitorFormModal mode="create" channels={channels} />
    </div>
  );
}
