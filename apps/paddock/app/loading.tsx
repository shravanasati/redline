import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
      <div className="relative flex flex-col items-center">
        {/* Dotted Spinner Background */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Outer dotted ring rotating clockwise */}
          <svg
            className="absolute inset-0 h-full w-full animate-spin text-primary"
            viewBox="0 0 100 100"
            style={{ animationDuration: "3s" }}
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="0 11"
              strokeLinecap="round"
              className="opacity-90"
            />
          </svg>

          {/* Inner dotted ring rotating counter-clockwise */}
          <svg
            className="absolute inset-0 h-full w-full animate-spin text-secondary"
            viewBox="0 0 100 100"
            style={{
              animationDuration: "6s",
              animationDirection: "reverse",
            }}
          >
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeDasharray="0 10"
              strokeLinecap="round"
              className="opacity-70"
            />
          </svg>

          {/* Centered Pulsing Icon */}
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border/40 shadow-xs">
            <Activity className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>

        {/* Loading text with site styling */}
        <div className="mt-6 text-center">
          <h2 className="font-heading text-lg font-bold tracking-wide text-foreground">
            redline
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground animate-pulse">
            loading...
          </p>
        </div>
      </div>
    </div>
  );
}
