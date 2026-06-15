import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pt-36 lg:pt-44">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
          <Activity className="size-3 text-primary" />
          Distributed uptime monitoring for modern teams
        </div>

        <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          Never miss an outage.
          <br />
          <span className="text-primary">Monitor everywhere.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Redline checks your services from nodes around the globe every 30
          seconds. Get alerted the instant something goes down — before your
          users notice.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="gap-2 text-base">
            Start Monitoring
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" size="lg" className="text-base">
            View Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
