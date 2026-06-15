import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const monitors = [
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

function ClockSVG() {
  return (
    <svg
      className="absolute top-8 right-[15%] h-48 w-48 text-primary/5 hidden sm:block"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M50 5 A45 45 0 1 1 5 50"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M50 15 A35 35 0 1 1 15 50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="30 80"
      />
      <circle cx="50" cy="50" r="3" fill="currentColor" />
      <line
        x1="50"
        y1="50"
        x2="22"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-28 sm:px-6 sm:pt-36 lg:pb-32 lg:pt-44">
      <div className="pointer-events-none absolute inset-0 -z-10 select-none">
        <div className="absolute top-1/4 left-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute -top-32 right-1/4 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <ClockSVG />
      </div>

      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Never miss an outage.
            <br />
            <span className="bg-linear-to-r from-destructive to-primary bg-clip-text text-transparent">
              Monitor everywhere.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
            Redline checks your services from nodes around the globe every 30
            seconds. Get alerted the instant something goes down — before your
            users notice.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
            <Button size="lg" className="gap-2 text-base shadow-xs">
              Start Monitoring
              <ArrowRight className="size-4" />
            </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-base shadow-xs">
              View Live Demo
            </Button>
          </div>
        </div>

        <div className="relative mt-16 lg:mt-0">
          <div className="absolute -inset-x-4 -inset-y-2 -z-10 rounded-3xl bg-linear-to-b from-primary/5 to-transparent blur-xl" />
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
              {monitors.map((monitor) => (
                <div
                  key={monitor.name}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">
                      {monitor.status === "up" ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
                          <Check className="size-3 text-emerald-500" />
                        </span>
                      ) : monitor.status === "degraded" ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/15">
                          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        </span>
                      ) : (
                        <span className="flex size-5 items-center justify-center rounded-full bg-destructive/15">
                          <X className="size-3 text-destructive" />
                        </span>
                      )}
                    </div>
                    <code className="truncate text-sm font-medium">
                      {monitor.name}
                    </code>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span
                      className={`text-xs tabular-nums ${
                        monitor.status === "down"
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {monitor.latency}
                    </span>
                    <span className="hidden text-xs text-muted-foreground/60 sm:inline">
                      {monitor.checked}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -bottom-3 -right-3 -z-10 size-full rounded-2xl border border-border/30 bg-background/50" />
        </div>
      </div>
    </section>
  );
}
