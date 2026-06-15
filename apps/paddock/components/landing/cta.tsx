import { Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="border-t border-border/40 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card px-6 py-16 shadow-xl sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-xs">
                <Activity className="size-3 text-primary" />
                Start in under 2 minutes
              </div>

              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to redline your reliability?
              </h2>
              <p className="mt-4 text-muted-foreground">
                No credit card required. Free tier includes 5 monitors and
                10,000 checks per month.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2 text-base shadow-xs">
                    Get Started Free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                {/* <Button
                  variant="outline"
                  size="lg"
                  className="text-base shadow-xs"
                >
                  Talk to Sales
                </Button> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
