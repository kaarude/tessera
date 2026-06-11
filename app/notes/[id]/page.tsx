"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  Edit3,
  Download,
  Lock,
  Share2,
  Trash2,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useBeforeUnload } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const { currentTeamId } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) throw new Error("Failed to load note");
      return res.json();
    },
  });

  // Reset the form when the loaded note changes (different id). Using
  // `useEffect` is correct here because the source of truth is the React
  // Query cache; we just mirror it into local form state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setIsPrivate(note.isPrivate);
    }
    // We intentionally only re-sync when the note's id changes — not on
    // every cache update — to avoid clobbering in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isDirty =
    note &&
    (title !== note.title ||
      content !== (note.content || "") ||
      isPrivate !== note.isPrivate);
  useBeforeUnload(isDirty);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onMutate: () => setSaving(true),
    onSettled: () => setSaving(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", id] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setLastSaved(new Date());
      toast.success("Saved");
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      router.push("/notes");
      toast.success("Note deleted");
    },
  });

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    updateMutation.mutate({ title, content, isPrivate });
  }, [title, content, isPrivate, updateMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && showShare) {
        setShowShare(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave, showShare]);

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            role="status"
          />
        </div>
      </AppShell>
    );
  }

  if (!note) {
    return (
      <AppShell>
        <div className="flex h-64 flex-col items-center justify-center">
          <p className="text-muted-foreground">Note not found</p>
          <Link
            href="/notes"
            className="mt-2 text-primary hover:underline text-sm"
          >
            Back to notes
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/notes"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              aria-label="Back to notes"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-xl font-bold text-foreground outline-none placeholder:text-muted-foreground min-w-0"
                placeholder="Untitled Note"
                aria-label="Note title"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {isPrivate ? (
                  <>
                    <Lock size={11} />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Share2 size={11} className="text-emerald-400" />
                    <span className="text-emerald-400">Shared</span>
                  </>
                )}
                <span>·</span>
                <span>
                  {lastSaved
                    ? `Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : `Edited ${new Date(note.updatedAt).toLocaleDateString()}`}
                </span>
                {isDirty && (
                  <span className="text-amber-400">· Unsaved changes</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex rounded-lg border border-border bg-muted p-0.5">
              <button
                onClick={() => setMode("edit")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  mode === "edit"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={mode === "edit"}
              >
                <Edit3 size={13} />
                Edit
              </button>
              <button
                onClick={() => setMode("preview")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  mode === "preview"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={mode === "preview"}
              >
                <Eye size={13} />
                Preview
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {saving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Save size={14} />
              )}
              <span className="hidden sm:inline">Save</span>
              <kbd className="hidden lg:inline rounded bg-primary-foreground/20 px-1 text-[9px] font-mono">
                Cmd+S
              </kbd>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              aria-label="Download as Markdown"
              title="Download .md"
            >
              <Download size={14} />
            </button>

            {currentTeamId && (
              <button
                onClick={() => setShowShare(!showShare)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors",
                  showShare
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm("Delete this note? This cannot be undone."))
                  deleteMutation.mutate();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Delete note"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Share Panel */}
        {showShare && currentTeamId && (
          <div
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
            role="region"
            aria-label="Sharing settings"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Sharing</h3>
              <button
                onClick={() => setShowShare(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close sharing panel"
                data-modal-close=""
              >
                <X size={16} />
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!isPrivate}
                  onChange={(e) => {
                    const next = !e.target.checked;
                    setIsPrivate(next);
                    updateMutation.mutate({ isPrivate: next });
                  }}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "h-5 w-9 rounded-full transition-colors",
                    !isPrivate ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5",
                      !isPrivate ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </div>
              </div>
              <span className="text-sm text-foreground">
                {isPrivate
                  ? "Private — only you can see this"
                  : "Shared with team"}
              </span>
            </label>
          </div>
        )}

        {/* Editor / Preview */}
        <div className="rounded-xl border border-border overflow-hidden">
          {mode === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-card px-5 py-4 text-sm text-foreground outline-none font-mono leading-relaxed resize-y min-h-[500px]"
              placeholder="# Start writing in markdown..."
              spellCheck={false}
              aria-label="Note content"
            />
          ) : (
            <div className="prose-dark max-w-none px-5 py-4 min-h-[500px]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content || "*No content yet*"}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
