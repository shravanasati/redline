"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Monitor {
  name: string;
  status: "up" | "degraded" | "down";
  latency: string;
  checked: string;
}

const initialMonitors: Monitor[] = [
  { name: "api.redline.io", status: "up", latency: "42ms", checked: "2s ago" },
  { name: "app.redline.io", status: "up", latency: "38ms", checked: "1s ago" },
  {
    name: "db.redline.io",
    status: "degraded",
    latency: "312ms",
    checked: "3s ago",
  },
  { name: "cdn.redline.io", status: "up", latency: "12ms", checked: "0s ago" },
  { name: "auth.redline.io", status: "down", latency: "—", checked: "8s ago" },
  { name: "docs.redline.io", status: "up", latency: "55ms", checked: "2s ago" },
];

function StatusIcon({
  status,
  loading,
}: {
  status: Monitor["status"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-muted-foreground/10">
        <span className="size-2 rounded-full bg-muted-foreground/40 animate-pulse" />
      </span>
    );
  }

  if (status === "up") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
        <Check className="size-3 text-emerald-500" />
      </span>
    );
  }

  if (status === "degraded") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/15">
        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
      </span>
    );
  }

  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-destructive/15">
      <X className="size-3 text-destructive" />
    </span>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 1) return "0s ago";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m ago` : `${m}m ${s}s ago`;
}

export function DashboardPreview() {
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5]),
  );
  const [lastCheckedAt, setLastCheckedAt] = useState<Map<number, number>>(
    new Map(),
  );
  const [now, setNow] = useState(Date.now());

  const resolveIndex = useCallback((i: number) => {
    setLoadingIndices((prev) => {
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
    setLastCheckedAt((prev) => {
      const next = new Map(prev);
      next.set(i, Date.now());
      return next;
    });
  }, []);

  const loadingIndicesRef = useRef(loadingIndices);
  loadingIndicesRef.current = loadingIndices;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    initialMonitors.forEach((_, i) => {
      const timer = setTimeout(() => resolveIndex(i), 20 + Math.random() * 580);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [resolveIndex]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const shuffled = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
      const toRecheck = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));

      setLoadingIndices((prev) => {
        const next = new Set(prev);
        for (const i of toRecheck) next.add(i);
        return next;
      });

      toRecheck.forEach((idx) => {
        setTimeout(() => resolveIndex(idx), 20 + Math.random() * 580);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [resolveIndex]);

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-destructive/60" />
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      <div className="divide-y divide-border/10 px-4 py-2">
        {initialMonitors.map((monitor, i) => {
          const lastCheck = lastCheckedAt.get(i);
          const seconds = lastCheck ? Math.floor((now - lastCheck) / 1000) : 0;

          return (
            <div
              key={monitor.name}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <StatusIcon
                    status={monitor.status}
                    loading={loadingIndices.has(i)}
                  />
                </div>
                <code className="truncate text-sm font-medium">
                  {monitor.name}
                </code>
              </div>
              <div className="flex items-center gap-9 shrink-0 ml-4">
                <span
                  className={`w-12 text-right text-xs tabular-nums ${
                    loadingIndices.has(i)
                      ? "text-muted-foreground/40"
                      : monitor.status === "down"
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {loadingIndices.has(i) ? "—" : monitor.latency}
                </span>
                <span
                  className={`hidden w-20 text-right text-xs tabular-nums sm:inline ${
                    loadingIndices.has(i)
                      ? "text-muted-foreground/30"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {loadingIndices.has(i) ? "checking…" : formatTime(seconds)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
