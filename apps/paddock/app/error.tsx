"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-4">💥</div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">500</h1>
        <p className="text-xl text-muted-foreground mb-4">
          Something went wrong! An unexpected error occurred.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer"
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
