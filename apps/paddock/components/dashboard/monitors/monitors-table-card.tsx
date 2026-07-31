import { MonitorsTable } from "@/components/dashboard/monitors/monitors-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Monitor } from "@/lib/db/crud/monitors";
import type { NotificationChannel } from "@/lib/db/crud/notifications";

type MonitorsTableCardProps = {
  monitors: Monitor[];
  channels?: NotificationChannel[];
};

export function MonitorsTableCard({ monitors, channels }: MonitorsTableCardProps) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="border-b [.border-b]:pb-5">
          <CardTitle>All Monitors</CardTitle>
          <CardDescription>
            Manage and configure your endpoint monitors.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-0 [--card-spacing:0]">
          <MonitorsTable monitors={monitors} channels={channels} />
        </CardContent>
      </Card>
    </div>
  );
}
