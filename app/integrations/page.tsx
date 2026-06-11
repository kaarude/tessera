"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Link2, LogOut, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [hook, setHook] = useState({ name: "", url: "" });
  const [newSecret, setNewSecret] = useState("");
  const { data: tokens = [] } = useQuery({
    queryKey: ["api-tokens"],
    queryFn: () => fetch("/api/tokens").then((response) => response.json()),
  });
  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => fetch("/api/webhooks").then((response) => response.json()),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => fetch("/api/sessions").then((response) => response.json()),
  });

  const createToken = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName,
          scopes: ["notes:create", "tasks:create", "calendar:create"],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setNewToken(data.token);
      setTokenName("");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createWebhook = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hook,
          events: ["note.create", "task.create", "calendar_entry.create"],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setNewSecret(data.secret);
      setHook({ name: "", url: "" });
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage personal API access, outbound notifications, and signed-in
            devices.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound size={18} />
            <h2 className="font-semibold">Personal API tokens</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
              placeholder="Token name"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => createToken.mutate()}
              disabled={!tokenName || createToken.isPending}
              className={buttonVariants()}
            >
              <Plus size={14} /> Create
            </button>
          </div>
          {newToken && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs font-medium text-warning">
                Copy this token now. It will not be shown again.
              </p>
              <code className="mt-2 block break-all text-xs">{newToken}</code>
            </div>
          )}
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {tokens.map((token: any) => (
              <div key={token.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {token.prefix}… · {token.scopes.length} scopes
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/tokens/${token.id}`, {
                      method: "DELETE",
                    });
                    queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Revoke token"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Link2 size={18} />
            <h2 className="font-semibold">Outbound webhooks</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input
              value={hook.name}
              onChange={(event) =>
                setHook({ ...hook, name: event.target.value })
              }
              placeholder="Name"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
            />
            <input
              value={hook.url}
              onChange={(event) =>
                setHook({ ...hook, url: event.target.value })
              }
              placeholder="https://example.com/webhooks/tessera"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => createWebhook.mutate()}
              disabled={!hook.name || !hook.url}
              className={buttonVariants()}
            >
              Add
            </button>
          </div>
          {newSecret && (
            <p className="rounded-lg bg-muted p-3 text-xs">
              Signing secret: <code>{newSecret}</code>
            </p>
          )}
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {webhooks.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.url}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/webhooks/${item.id}`, {
                      method: "DELETE",
                    });
                    queryClient.invalidateQueries({ queryKey: ["webhooks"] });
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete webhook"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LogOut size={18} />
            <h2 className="font-semibold">Active sessions</h2>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {sessions.map((session: any) => (
              <div key={session.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {session.userAgent || "Unknown browser"}
                    {session.current ? " · Current" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress || "IP unavailable"} · Last active{" "}
                    {new Date(session.lastSeenAt).toLocaleString()}
                  </p>
                </div>
                {!session.current && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/sessions/${session.id}`, {
                        method: "DELETE",
                      });
                      queryClient.invalidateQueries({ queryKey: ["sessions"] });
                    }}
                    className={cn(
                      buttonVariants({ variant: "destructive", size: "sm" }),
                    )}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
