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
    iconAccent: "from-primary/15 to-primary/5 text-primary ring-primary/10 group-hover:from-primary/30 group-hover:to-primary/10 group-hover:ring-primary/20",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description:
      "Slack, PagerDuty, email, SMS, or webhook — pick your channel. Alerts fire in under 5 seconds of detection.",
    accent: "from-secondary/20 to-secondary/5",
    iconAccent: "from-secondary/15 to-secondary/5 text-secondary-foreground ring-secondary/10 group-hover:from-secondary/30 group-hover:to-secondary/10 group-hover:ring-secondary/20",
  },
  {
    icon: BarChart3,
    title: "Real-time Dashboards",
    description:
      "Live latency heatmaps, uptime calendars, and response-time trends. Shareable with your whole team.",
    accent: "from-accent/20 to-accent/5",
    iconAccent: "from-accent/15 to-accent/5 text-accent-foreground ring-accent/10 group-hover:from-accent/30 group-hover:to-accent/10 group-hover:ring-accent/20",
  },
  {
    icon: RefreshCw,
    title: "30-Second Intervals",
    description:
      "Checks run as fast as every 30 seconds from every node. No more waiting 5 minutes to know you're down.",
    accent: "from-primary/20 to-primary/5",
    iconAccent: "from-primary/15 to-primary/5 text-primary ring-primary/10 group-hover:from-primary/30 group-hover:to-primary/10 group-hover:ring-primary/20",
  },
  {
    icon: Shield,
    title: "Status Pages",
    description:
      "Hosted status pages with custom domains and branding. Keep your users informed without exposing internals.",
    accent: "from-secondary/20 to-secondary/5",
    iconAccent: "from-secondary/15 to-secondary/5 text-secondary-foreground ring-secondary/10 group-hover:from-secondary/30 group-hover:to-secondary/10 group-hover:ring-secondary/20",
  },
  {
    icon: Gauge,
    title: "SSL & Domain Tracking",
    description:
      "Monitor certificate expiry, DNS resolution, and response body matching alongside basic uptime checks.",
    accent: "from-accent/20 to-accent/5",
    iconAccent: "from-accent/15 to-accent/5 text-accent-foreground ring-accent/10 group-hover:from-accent/30 group-hover:to-accent/10 group-hover:ring-accent/20",
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
            Everything you need to{" "}
            <span className="relative inline-block">
              <span className="bg-linear-to-r from-primary to-destructive bg-clip-text text-transparent">
                stay online
              </span>
              <svg
                className="absolute -bottom-1 left-0 w-full overflow-visible"
                height="6"
                viewBox="0 0 200 6"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2,4 Q50,1 100,3 Q150,5 198,2"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  className="text-primary/50"
                />
              </svg>
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            From multi-region checks to beautiful status pages — redline ships
            every tool your team needs to deliver reliable services.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group relative border border-border/50 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-hero-fade"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Top accent stripe — grows slightly on hover */}
                <div
                  className={`absolute inset-x-0 top-0 h-[3px] bg-linear-to-r transition-all duration-300 group-hover:h-1 ${feature.accent}`}
                />
                <CardContent className="flex flex-col gap-3">
                  {/* Icon box with color + glow on hover */}
                  <div
                    className={`flex size-11 items-center justify-center rounded-xl bg-linear-to-br ring-1 transition-all duration-300 ${feature.iconAccent}`}
                    style={{
                      boxShadow: "var(--shadow-none, none)",
                    }}
                  >
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
