"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "react-hot-toast";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export default function SecurityPage() {
  const queryClient = useQueryClient();
  const [restorePreview, setRestorePreview] = useState<Record<
    string,
    number
  > | null>(null);
  const [validatedBackupId, setValidatedBackupId] = useState("");
  const { data: diagnostics, isLoading } = useQuery({
    queryKey: ["security-diagnostics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/diagnostics");
      if (!response.ok) throw new Error("Admin access required");
      return response.json();
    },
  });
  const { data: backups = [] } = useQuery({
    queryKey: ["backups"],
    queryFn: () =>
      fetch("/api/admin/backups").then((response) => response.json()),
  });
  const createBackup = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/backups", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Backup created");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["security-diagnostics"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Security Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operational health, active access, configuration risks, and
              recoverability.
            </p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["security-diagnostics"],
              });
              queryClient.invalidateQueries({ queryKey: ["backups"] });
            }}
            className={buttonVariants({ variant: "outline" })}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Users, "Active sessions", diagnostics?.sessions || 0],
            [Activity, "Failed-login buckets", diagnostics?.failedLogins || 0],
            [
              HardDrive,
              "Storage",
              formatBytes(diagnostics?.storage?.bytes || 0),
            ],
            [Database, "Backups", diagnostics?.backups || 0],
          ].map(([Icon, label, value]: any) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Icon size={18} className="text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />
            <h2 className="font-semibold">Configuration review</h2>
          </div>
          {diagnostics?.warnings?.length ? (
            <div className="divide-y divide-border rounded-xl border border-warning/30 bg-warning/5">
              {diagnostics.warnings.map((warning: string) => (
                <div key={warning} className="flex gap-3 p-4">
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0 text-warning"
                  />
                  <p className="text-sm">{warning}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No configuration warnings detected.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Instance backups</h2>
              <p className="text-xs text-muted-foreground">
                Snapshots are stored in the configured object store and
                protected by SHA-256 checksums.
              </p>
            </div>
            <button
              onClick={() => createBackup.mutate()}
              disabled={createBackup.isPending}
              className={buttonVariants()}
            >
              <Database size={14} />
              {createBackup.isPending ? "Creating…" : "Create backup"}
            </button>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {backups.map((backup: any) => (
              <div
                key={backup.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {backup.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(backup.size)} ·{" "}
                    {new Date(backup.createdAt).toLocaleString()} ·{" "}
                    {backup.createdBy.name}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const response = await fetch(
                      `/api/admin/backups/${backup.id}/restore`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          confirmation: "RESTORE TESSERA",
                          previewOnly: true,
                        }),
                      },
                    );
                    const data = await response.json();
                    if (!response.ok) return toast.error(data.error);
                    setRestorePreview(data.counts);
                    setValidatedBackupId(backup.id);
                  }}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Validate restore
                </button>
              </div>
            ))}
            {!backups.length && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No backups have been created.
              </p>
            )}
          </div>
          {restorePreview && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">Restore manifest validated</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Object.entries(restorePreview)
                  .map(([name, count]) => `${count} ${name}`)
                  .join(" · ")}
              </p>
              <p className="mt-3 text-xs text-warning">
                Restoring replaces application data and revokes every active
                session. Keep this browser open until the request completes.
              </p>
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      "Restore this backup now? Current application data will be replaced and all users will be signed out.",
                    )
                  ) {
                    return;
                  }
                  const response = await fetch(
                    `/api/admin/backups/${validatedBackupId}/restore`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        confirmation: "RESTORE TESSERA",
                        previewOnly: false,
                      }),
                    },
                  );
                  const data = await response.json();
                  if (!response.ok) return toast.error(data.error);
                  window.location.href = "/login";
                }}
                className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
              >
                Restore validated backup
              </button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
