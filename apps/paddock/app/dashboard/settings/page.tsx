import { headers } from "next/headers";
import { NotificationChannelsClient } from "@/components/dashboard/settings/notification-channels-client";
import Unauthenticated from "@/components/unauthorized";
import { fetchNotificationChannelsByUser } from "@/lib/actions/notifications";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Notification Channels | redline",
  description: "Manage your notification channels for service uptime alerts.",
};

export default async function NotificationsPage() {
  const reqHeaders = await headers();
  const session = await getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return <Unauthenticated />;
  }

  const result = await fetchNotificationChannelsByUser();
  const channels = result.success && result.data ? result.data : [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-6 @container/main">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Notification Channels
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up notification channels to receive real-time alerts when your
          monitors experience downtime.
        </p>
      </div>

      {/* todo add suspense */}
      <NotificationChannelsClient initialChannels={channels} />
    </div>
  );
}
