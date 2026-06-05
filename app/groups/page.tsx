"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FolderTree, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { toast } from "react-hot-toast";

export default function GroupsPage() {
  const { currentTeamId } = useAppStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups", currentTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/groups?teamId=${currentTeamId || ""}`);
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
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setNewGroup({ name: "", description: "" });
      toast.success("Group created");
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Groups</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} />
            New Group
          </button>
        </div>

        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Create Group</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="Group name"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <textarea
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <select
                value={currentTeamId || ""}
                onChange={(e) => {}}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Select team</option>
                {teams?.map((team: any) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <button
                onClick={() => createMutation.mutate({ ...newGroup, teamId: currentTeamId })}
                disabled={!newGroup.name || !currentTeamId || createMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups?.map((group: any) => (
              <div key={group.id} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderTree size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">{group.team?.name}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{group.description || "No description"}</p>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !groups?.length && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <FolderTree size={40} className="mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No groups yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Create a group
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
