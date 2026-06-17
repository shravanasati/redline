import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { Button } from "@/components/ui/button";

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

/** Slanted SVG underline that draws in on mount */
function SlantedUnderline() {
  return (
    <svg
      className="absolute -bottom-2 left-0 w-full overflow-visible"
      height="10"
      viewBox="0 0 200 10"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M2,7 Q50,2 100,5 Q150,8 198,3"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        className="text-primary animate-draw-line"
        style={{
          strokeDasharray: 220,
          strokeDashoffset: 220,
        }}
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
          {/* Staggered fade-in for h1 */}
          <h1
            className="font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl animate-hero-fade"
            style={{ animationDelay: "0ms" }}
          >
            Never miss an outage.
            <br />
            <span>
              <span className="bg-linear-to-r from-destructive to-primary bg-clip-text text-transparent">
                Monitor{" "}
              </span>
              <span className="relative inline-block">
                <span className="bg-linear-to-r from-destructive to-primary bg-clip-text text-transparent">
                  everywhere
                </span>
                <SlantedUnderline />
              </span>
              <span className="bg-linear-to-r from-destructive to-primary bg-clip-text text-transparent">
                .
              </span>
            </span>
          </h1>

          {/* Staggered fade-in for paragraph */}
          <p
            className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg animate-hero-fade"
            style={{ animationDelay: "120ms" }}
          >
            Redline checks your services from nodes around the globe every 30
            seconds. Get alerted the instant something goes down — before your
            users notice.
          </p>

          {/* Staggered fade-in for buttons */}
          <div
            className="mt-8 flex flex-col gap-3 sm:flex-row animate-hero-fade"
            style={{ animationDelay: "240ms" }}
          >
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
          <DashboardPreview />
          <div className="absolute -bottom-3 -right-3 -z-10 size-full rounded-2xl border border-border/30 bg-background/50" />
        </div>
      </div>
    </section>
  );
}
