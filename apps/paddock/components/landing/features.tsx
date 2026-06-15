import { BarChart3, Bell, Gauge, Globe, RefreshCw, Shield } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Global Monitoring",
    description:
      "12 pop locations across 5 continents. Every check runs from 3+ nodes simultaneously for zero false positives.",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description:
      "Slack, PagerDuty, email, SMS, or webhook — pick your channel. Alerts fire in under 5 seconds of detection.",
  },
  {
    icon: BarChart3,
    title: "Real-time Dashboards",
    description:
      "Live latency heatmaps, uptime calendars, and response-time trends. Shareable with your whole team.",
  },
  {
    icon: RefreshCw,
    title: "30-Second Intervals",
    description:
      "Checks run as fast as every 30 seconds from every node. No more waiting 5 minutes to know you're down.",
  },
  {
    icon: Shield,
    title: "Status Pages",
    description:
      "Hosted status pages with custom domains and branding. Keep your users informed without exposing internals.",
  },
  {
    icon: Gauge,
    title: "SSL & Domain Tracking",
    description:
      "Monitor certificate expiry, DNS resolution, and response body matching alongside basic uptime checks.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to stay online
          </h2>
          <p className="mt-4 text-muted-foreground">
            From multi-region checks to beautiful status pages — redline ships
            every tool your team needs to deliver reliable services.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card p-6 shadow-xs transition-all hover:shadow-md"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-heading font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
