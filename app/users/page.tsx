"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, X, Trash2, RefreshCw, Shield } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    isAdmin: false,
    teamIds: [] as string[],
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        isAdmin: false,
        teamIds: [],
      });
      toast.success("User created");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: any) => {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPassword: password,
          forceReset: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Password reset. User must change password on next login.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Users
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform administrators can access every team and manage all
              users. Grant this privilege only to trusted operators.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className={cn(buttonVariants({ size: "lg" }), "px-4")}
          >
            <Plus size={16} />
            New User
          </button>
        </div>

        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Create User</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                placeholder="Full name"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                required
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                placeholder="Email address"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                required
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                placeholder="Initial password"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                required
                minLength={8}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={newUser.isAdmin}
                  onChange={(e) =>
                    setNewUser({ ...newUser, isAdmin: e.target.checked })
                  }
                  className="rounded border-border text-primary"
                />
                <label htmlFor="isAdmin" className="text-sm text-foreground">
                  Grant admin privileges
                </label>
              </div>
              {newUser.isAdmin && (
                <p className="rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Administrators can manage every user, team, role, and audit
                  log across the installation.
                </p>
              )}
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">
                  Assign to teams
                </label>
                <div className="flex flex-wrap gap-2">
                  {teams?.map((team: any) => (
                    <label
                      key={team.id}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newUser.teamIds.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUser({
                              ...newUser,
                              teamIds: [...newUser.teamIds, team.id],
                            });
                          } else {
                            setNewUser({
                              ...newUser,
                              teamIds: newUser.teamIds.filter(
                                (id) => id !== team.id,
                              ),
                            });
                          }
                        }}
                        className="rounded border-border text-primary"
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={() => createMutation.mutate(newUser)}
                disabled={
                  !newUser.name ||
                  !newUser.email ||
                  !newUser.password ||
                  createMutation.isPending
                }
                className={cn(buttonVariants(), "px-4")}
              >
                {createMutation.isPending ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Teams
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user: any) => (
                    <tr
                      key={user.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.memberships?.slice(0, 3).map((m: any) => (
                            <span
                              key={m.team.id}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {m.team.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {user.isAdmin && (
                            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              <Shield size={10} />
                              Admin
                            </span>
                          )}
                          {user.mustChangePassword && (
                            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                              Reset required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            const pwd = prompt(
                              "Enter new temporary password (min 8 chars):",
                            );
                            if (pwd && pwd.length >= 8) {
                              resetPasswordMutation.mutate({
                                userId: user.id,
                                password: pwd,
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                          title="Force password reset"
                        >
                          <RefreshCw size={12} />
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!users?.length && (
              <div className="flex flex-col items-center justify-center py-20">
                <Users size={40} className="mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No users yet
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className={cn(buttonVariants({ size: "sm" }), "mt-3 px-4")}
                >
                  <Plus size={14} />
                  Create a user
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
