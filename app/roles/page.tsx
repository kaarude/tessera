"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, X, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { ALL_PERMISSIONS, PERMISSION_DESCRIPTIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function RolesPage() {
  const { currentTeamId } = useAppStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles", currentTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/roles?teamId=${currentTeamId || ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowCreate(false);
      setNewRole({ name: "", description: "", permissions: [] });
      toast.success("Role created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, permissions }: any) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setEditingRole(null);
      toast.success("Role updated");
    },
  });

  function togglePermission(
    permission: string,
    current: string[],
    setter: (p: string[]) => void,
  ) {
    if (current.includes(permission)) {
      setter(current.filter((p) => p !== permission));
    } else {
      setter([...current, permission]);
    }
  }

  const categorizedPermissions = {
    Platform: ALL_PERMISSIONS.filter(
      (p) =>
        p.startsWith("users:") ||
        p.startsWith("teams:") ||
        p.startsWith("groups:") ||
        p.startsWith("roles:") ||
        p.startsWith("admin:") ||
        p === "audit:view_all",
    ),
    Notes: ALL_PERMISSIONS.filter((p) => p.startsWith("notes:")),
    Calendar: ALL_PERMISSIONS.filter((p) => p.startsWith("calendar:")),
    Tasks: ALL_PERMISSIONS.filter((p) => p.startsWith("tasks:")),
    Audit: ALL_PERMISSIONS.filter(
      (p) => p.startsWith("audit:") && p !== "audit:view_all",
    ),
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Roles & Permissions
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            New Role
          </button>
        </div>

        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Create Role</h3>
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
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
                placeholder="Role name"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <textarea
                value={newRole.description}
                onChange={(e) =>
                  setNewRole({ ...newRole, description: e.target.value })
                }
                placeholder="Description"
                rows={2}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={() =>
                  createMutation.mutate({ ...newRole, teamId: currentTeamId })
                }
                disabled={!newRole.name || createMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {roles?.map((role: any) => (
              <div
                key={role.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {role.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {role.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setEditingRole(editingRole?.id === role.id ? null : role)
                    }
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {editingRole?.id === role.id ? "Done" : "Edit Permissions"}
                  </button>
                </div>

                {editingRole?.id === role.id && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    {Object.entries(categorizedPermissions).map(
                      ([category, perms]) => (
                        <div key={category}>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {category}
                          </h4>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {perms.map((perm) => {
                              const isChecked = editingRole.permissions?.some(
                                (p: any) => p.permission === perm,
                              );
                              return (
                                <label
                                  key={perm}
                                  title={PERMISSION_DESCRIPTIONS[perm]}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const current =
                                        editingRole.permissions.map(
                                          (p: any) => p.permission,
                                        );
                                      const updated = isChecked
                                        ? current.filter(
                                            (p: string) => p !== perm,
                                          )
                                        : [...current, perm];
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: updated.map(
                                          (p: string) => ({ permission: p }),
                                        ),
                                      });
                                    }}
                                    className="rounded border-border text-primary"
                                  />
                                  <span className="text-xs">{perm}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    )}
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: role.id,
                          permissions: editingRole.permissions.map(
                            (p: any) => p.permission,
                          ),
                        })
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Check size={14} />
                      Save Permissions
                    </button>
                  </div>
                )}

                {!editingRole?.id && (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions?.slice(0, 8).map((p: any) => (
                      <span
                        key={p.id}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {p.permission}
                      </span>
                    ))}
                    {role.permissions?.length > 8 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        +{role.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && !roles?.length && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <Shield size={40} className="mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No roles yet
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Create a role
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
