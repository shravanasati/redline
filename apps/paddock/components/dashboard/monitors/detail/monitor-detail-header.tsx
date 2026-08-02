"use client";

import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
  GlobeIcon,
  LoaderIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  ServerIcon,
  WifiIcon,
} from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Monitor } from "@/lib/db/crud/monitors";
import type { NotificationChannel } from "@/lib/db/crud/notifications";
import { toggleMonitorPauseAction } from "@/lib/actions/monitors";
import { DeleteMonitorButton } from "../delete-monitor-button";
import { MonitorFormModal } from "../monitor-form-modal";

function MonitorTypeIcon({ type }: { type: Monitor["type"] }) {
  const icons = {
    HTTP: <GlobeIcon className="size-4" />,
    HTTPS: <GlobeIcon className="size-4" />,
    ICMP: <WifiIcon className="size-4" />,
    TCP: <NetworkIcon className="size-4" />,
    DNS: <ServerIcon className="size-4" />,
  };
  return icons[type] ?? <ActivityIcon className="size-4" />;
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
        className="gap-1.5 border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive"
      >
        <AlertCircleIcon className="size-3.5" />
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
    <Badge
      variant="outline"
      className={`gap-1.5 px-2.5 py-1 text-xs capitalize ${styles[status]}`}
    >
      <span
        className={`size-2 rounded-full ${
          status === "active"
            ? "bg-emerald-500 animate-pulse"
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
  if (seconds < 60) return `${seconds}s interval`;
  if (seconds < 3600) return `Every ${Math.round(seconds / 60)}m`;
  return `Every ${Math.round(seconds / 3600)}h`;
}

type MonitorDetailHeaderProps = {
  monitor: Monitor;
  channels?: NotificationChannel[];
};

export function MonitorDetailHeader({
  monitor,
  channels,
}: MonitorDetailHeaderProps) {
  const [isPending, startTransition] = useTransition();

  const handleTogglePause = () => {
    startTransition(async () => {
      await toggleMonitorPauseAction(monitor.id);
    });
  };

  const isPaused = monitor.status === "paused";

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard/monitors">
            <ArrowLeftIcon className="size-4" />
            Back to Monitors
          </Link>
        </Button>
      </div>

      {/* Main Header Content */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {monitor.name}
            </h1>
            <StatusBadge
              status={monitor.status}
              isFailing={monitor.isFailing}
            />
            <Badge
              variant="outline"
              className="gap-1 font-mono text-xs font-normal"
            >
              <MonitorTypeIcon type={monitor.type} />
              {monitor.type}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-mono">
            <span className="truncate max-w-md">{monitor.endpoint}</span>
            <span>•</span>
            <span>{formatFrequency(monitor.frequency)}</span>
            <span>•</span>
            <span>Timeout: {monitor.timeout}s</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePause}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : isPaused ? (
              <PlayIcon className="size-4 text-emerald-500" />
            ) : (
              <PauseIcon className="size-4 text-amber-500" />
            )}
            {isPaused ? "Resume Monitor" : "Pause Monitor"}
          </Button>

          <MonitorFormModal
            mode="edit"
            monitor={{
              ...monitor,
              assertions: (monitor.assertions ?? undefined) as any,
              metadata: (monitor.metadata ?? undefined) as any,
            }}
            channels={channels}
          />

          <DeleteMonitorButton
            monitorId={monitor.id}
            monitorName={monitor.name}
          />
        </div>
      </div>
    </div>
  );
}
