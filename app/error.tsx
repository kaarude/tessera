"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the console; in production you'd POST this to your error tracker
    // (Sentry, Highlight, etc.).
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex items-center justify-center text-destructive">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. You can try again."}
        </p>
        {error.digest ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground/70">
            ref: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <RefreshCcw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
