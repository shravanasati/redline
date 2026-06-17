"use client";

import { useEffect, useRef, useState } from "react";

interface StatItem {
  raw: number; // numeric value to animate to
  display: string; // final display string (e.g. "99.99%")
  prefix: string; // characters before the number (e.g. "<")
  suffix: string; // characters after the number (e.g. "%", "s")
  decimals: number;
  label: string;
}

const stats: StatItem[] = [
  {
    raw: 3,
    display: "12",
    prefix: "",
    suffix: "",
    decimals: 0,
    label: "Global Regions",
  },
  {
    raw: 30,
    display: "30s",
    prefix: "",
    suffix: "s",
    decimals: 0,
    label: "Check Intervals",
  },
  {
    raw: 99.99,
    display: "99.99%",
    prefix: "",
    suffix: "%",
    decimals: 2,
    label: "Uptime Tracked",
  },
  {
    raw: 5,
    display: "<5s",
    prefix: "<",
    suffix: "s",
    decimals: 0,
    label: "Alert Delivery",
  },
];

function useCountUp(target: number, decimals: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const duration = 1600;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, decimals]);

  return value;
}

function StatCard({
  stat,
  active,
  index,
}: {
  stat: StatItem;
  active: boolean;
  index: number;
}) {
  const value = useCountUp(stat.raw, stat.decimals, active);
  const displayed = active
    ? `${stat.prefix}${value.toFixed(stat.decimals)}${stat.suffix}`
    : "—";

  return (
    <div
      className="relative text-center animate-hero-fade"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Separator line on left for all but first item */}
      {index > 0 && (
        <div className="absolute left-0 top-1/2 hidden h-10 -translate-y-1/2 border-l border-border/30 sm:block" />
      )}

      <div className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
        <span className="bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent tabular-nums">
          {displayed}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-medium text-muted-foreground">
        {stat.label}
      </div>

      {/* Bottom accent line */}
      <div className="mx-auto mt-3 h-0.5 w-8 rounded-full bg-linear-to-r from-primary/60 to-primary/20" />
    </div>
  );
}

export function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} stat={stat} active={active} index={i} />
      ))}
    </div>
  );
}
