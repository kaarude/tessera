"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export default function AuditPage() {
  const [filters, setFilters] = useState({
    teamId: "",
    actorId: "",
    action: "",
    page: 1,
  });

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["audit", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.teamId) params.set("teamId", filters.teamId);
      if (filters.actorId) params.set("actorId", filters.actorId);
      if (filters.action) params.set("action", filters.action);
      params.set("page", String(filters.page));
      const res = await fetch(`/api/audit?${params.toString()}`);
      return res.json();
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
  });

  const actions = ["create", "update", "delete", "login", "change_password", "share"];

  const logs = auditData?.logs || [];
  const totalPages = auditData?.pages || 1;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track every action across the platform.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
          <select
            value={filters.teamId}
            onChange={(e) => setFilters({ ...filters, teamId: e.target.value, page: 1 })}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">All Teams</option>
            {teams?.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filters.actorId}
            onChange={(e) => setFilters({ ...filters, actorId: e.target.value, page: 1 })}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">All Users</option>
            {users?.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{log.actor?.name || "Unknown"}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          log.action === "create" && "bg-emerald-400/10 text-emerald-400",
                          log.action === "update" && "bg-amber-400/10 text-amber-400",
                          log.action === "delete" && "bg-destructive/10 text-destructive",
                          log.action === "login" && "bg-primary/10 text-primary"
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">{log.entityType} <span className="text-muted-foreground">{log.entityId.slice(0, 8)}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.team?.name || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && !logs?.length && (
            <div className="flex flex-col items-center justify-center py-20">
              <ClipboardList size={40} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No audit logs found</p>
              <p className="text-xs text-muted-foreground mt-1">Activity will appear here as users interact with the platform.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
              disabled={filters.page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {filters.page} of {totalPages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
              disabled={filters.page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
