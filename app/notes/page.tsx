"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Search,
  Lock,
  Share2,
  Download,
  Trash2,
  X,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { toast } from "react-hot-toast";

export default function NotesPage() {
  const { currentTeamId } = useAppStore();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIsPrivate, setNewIsPrivate] = useState(true);
  const queryClient = useQueryClient();

  const { data: notesRaw, isLoading } = useQuery({
    queryKey: ["notes", currentTeamId, search],
    queryFn: async () => {
      const res = await fetch(
        `/api/notes?teamId=${currentTeamId || ""}&search=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
  });
  const notes = Array.isArray(notesRaw) ? notesRaw : [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setShowCreate(false);
      setNewTitle("");
      setNewContent("");
      toast.success("Note created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
  });

  function handleDownload(note: any) {
    const blob = new Blob([note.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notes</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Create Note</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Note title"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                aria-label="Note title"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="# Write your markdown here..."
                rows={6}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary font-mono"
                aria-label="Note content"
              />
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={newIsPrivate}
                  onChange={(e) => setNewIsPrivate(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span className="text-sm text-foreground">Private</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    createMutation.mutate({
                      title: newTitle,
                      content: newContent,
                      teamId: currentTeamId,
                      isPrivate: newIsPrivate,
                    })
                  }
                  disabled={!newTitle.trim() || createMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : notes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notes.map((note: any) => (
              <div
                key={note.id}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Link href={`/notes/${note.id}`} className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText size={18} className="shrink-0 text-primary" />
                    <span className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {note.title}
                    </span>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.isPrivate ? (
                      <Lock size={13} className="text-muted-foreground" aria-label="Private" />
                    ) : (
                      <Share2 size={13} className="text-emerald-400" aria-label="Shared" />
                    )}
                  </div>
                </div>
                <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">
                  {note.content?.slice(0, 120) || "No content"}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(note)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Download as Markdown"
                      title="Download .md"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this note? This cannot be undone.")) deleteMutation.mutate(note.id);
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <Inbox size={40} className="mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No notes found</p>
            {search ? (
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                Create your first note
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
