import { BarChart3, Bell, Gauge, Globe, RefreshCw, Shield } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Globe,
    title: "Global Monitoring",
    description:
      "12 pop locations across 5 continents. Every check runs from 3+ nodes simultaneously for zero false positives.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description:
      "Slack, PagerDuty, email, SMS, or webhook — pick your channel. Alerts fire in under 5 seconds of detection.",
    accent: "from-secondary/20 to-secondary/5",
  },
  {
    icon: BarChart3,
    title: "Real-time Dashboards",
    description:
      "Live latency heatmaps, uptime calendars, and response-time trends. Shareable with your whole team.",
    accent: "from-accent/20 to-accent/5",
  },
  {
    icon: RefreshCw,
    title: "30-Second Intervals",
    description:
      "Checks run as fast as every 30 seconds from every node. No more waiting 5 minutes to know you're down.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: Shield,
    title: "Status Pages",
    description:
      "Hosted status pages with custom domains and branding. Keep your users informed without exposing internals.",
    accent: "from-secondary/20 to-secondary/5",
  },
  {
    icon: Gauge,
    title: "SSL & Domain Tracking",
    description:
      "Monitor certificate expiry, DNS resolution, and response body matching alongside basic uptime checks.",
    accent: "from-accent/20 to-accent/5",
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
              <Card
                key={feature.title}
                className="group relative border border-border/50 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${feature.accent}`}
                />
                <CardContent className="flex flex-col gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/10">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="font-semibold">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
