import { StatsCounter } from "@/components/landing/stats-counter";

export function Stats() {
  return (
    <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <StatsCounter />
      </div>
    </section>
  );
}
