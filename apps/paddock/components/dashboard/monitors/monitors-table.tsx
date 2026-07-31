"use client";

import {
  ActivityIcon,
  AlertCircleIcon,
  GlobeIcon,
  LoaderIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  ServerIcon,
  WifiIcon,
} from "lucide-react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NotificationChannel } from "@/lib/db/crud/notifications";
import { toggleMonitorPauseAction } from "@/lib/actions/monitors";
import { DeleteMonitorButton } from "./delete-monitor-button";
import { MonitorFormModal } from "./monitor-form-modal";

type Monitor = {
  id: string;
  name: string;
  type: "ICMP" | "HTTP" | "HTTPS" | "TCP" | "DNS";
  endpoint: string;
  frequency: number;
  timeout: number;
  status: "active" | "paused" | "draft";
  isFailing: boolean;
  createdAt: Date | null;
};

function MonitorTypeIcon({ type }: { type: Monitor["type"] }) {
  const icons = {
    HTTP: <GlobeIcon className="size-3.5" />,
    HTTPS: <GlobeIcon className="size-3.5" />,
    ICMP: <WifiIcon className="size-3.5" />,
    TCP: <NetworkIcon className="size-3.5" />,
    DNS: <ServerIcon className="size-3.5" />,
  };
  return icons[type] ?? <ActivityIcon className="size-3.5" />;
}

function StatusBadge({
  status,
  isFailing,
}: {
  status: Monitor["status"];
  isFailing: boolean;
}) {
  if (isFailing) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-destructive/40 bg-destructive/10 text-destructive"
      >
        <AlertCircleIcon className="size-3" />
        Failing
      </Badge>
    );
  }
  const styles = {
    active:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    paused:
      "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    draft: "border-muted-foreground/40 bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`gap-1 capitalize ${styles[status]}`}>
      <span
        className={`size-1.5 rounded-full ${
          status === "active"
            ? "bg-emerald-500"
            : status === "paused"
              ? "bg-amber-500"
              : "bg-muted-foreground"
        }`}
      />
      {status}
    </Badge>
  );
}

function formatFrequency(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function TogglePauseButton({
  monitorId,
  status,
}: {
  monitorId: string;
  status: "active" | "paused" | "draft";
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleMonitorPauseAction(monitorId);
    });
  };

  const isPaused = status === "paused";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={isPaused ? "Resume monitor" : "Pause monitor"}
      onClick={handleToggle}
      disabled={isPending}
      className={
        isPaused
          ? "hover:bg-emerald-500/10 hover:text-emerald-500"
          : "hover:bg-amber-500/10 hover:text-amber-500"
      }
    >
      {isPending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : isPaused ? (
        <PlayIcon className="size-4" />
      ) : (
        <PauseIcon className="size-4" />
      )}
      <span className="sr-only">{isPaused ? "Resume" : "Pause"}</span>
    </Button>
  );
}

export function MonitorsTable({
  monitors,
  channels,
}: {
  monitors: Monitor[];
  channels?: NotificationChannel[];
}) {
  if (monitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <ActivityIcon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">No monitors yet</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create your first monitor to start tracking uptime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="hidden md:table-cell">Endpoint</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Frequency</TableHead>
          <TableHead className="hidden lg:table-cell">Timeout</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {monitors.map((monitor) => (
          <TableRow key={monitor.id} className="group">
            <TableCell className="font-medium">{monitor.name}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className="gap-1 font-mono text-xs font-normal"
              >
                <MonitorTypeIcon type={monitor.type} />
                {monitor.type}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell max-w-xs">
              <span className="truncate block text-muted-foreground text-xs font-mono">
                {monitor.endpoint}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge
                status={monitor.status}
                isFailing={monitor.isFailing}
              />
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
              {formatFrequency(monitor.frequency)}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
              {monitor.timeout}s
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TogglePauseButton
                  monitorId={monitor.id}
                  status={monitor.status}
                />
                <MonitorFormModal
                  mode="edit"
                  monitor={monitor}
                  channels={channels}
                />
                <DeleteMonitorButton
                  monitorId={monitor.id}
                  monitorName={monitor.name}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
