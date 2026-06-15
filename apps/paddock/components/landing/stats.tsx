const stats = [
  { value: "12", label: "Global Regions" },
  { value: "30s", label: "Check Intervals" },
  { value: "99.99%", label: "Uptime Tracked" },
  { value: "<5s", label: "Alert Delivery" },
];

export function Stats() {
  return (
    <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                <span className="bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                  {stat.value}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-medium text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
