import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you were looking for doesn't exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
