"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  CheckSquare,
  Calendar,
  Users,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

type SearchResult = {
  type: "note" | "task" | "event" | "team";
  id: string;
  title: string;
  detail: string;
  href: string;
};

const icons = {
  note: FileText,
  task: CheckSquare,
  event: Calendar,
  team: Users,
};

export function UnifiedSearch() {
  const router = useRouter();
  const { currentTeamId } = useAppStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (open) queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (currentTeamId) params.set("teamId", currentTeamId);
        const response = await fetch(`/api/search?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setResults(data.results || []);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, currentTeamId]);
  const visibleResults = query.trim().length < 2 ? [] : results;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 min-w-48 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search everything</span>
        <kbd className="rounded bg-card px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Unified search"
            onMouseDown={() => setOpen(false)}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-popover"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search size={18} className="text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search notes, tasks, events, and teams"
                  className="h-14 flex-1 bg-transparent text-sm text-foreground outline-none focus-visible:shadow-none"
                />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close search"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[55vh] overflow-y-auto p-2">
                {loading && (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Searching…
                  </p>
                )}
                {!loading && query.length < 2 && (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Enter at least two characters.
                  </p>
                )}
                {!loading &&
                  query.length >= 2 &&
                  visibleResults.length === 0 && (
                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No accessible results found.
                    </p>
                  )}
                {!loading &&
                  visibleResults.map((result) => {
                    const Icon = icons[result.type];
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => {
                          setOpen(false);
                          router.push(result.href);
                        }}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                      >
                        <Icon
                          size={16}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.detail}
                          </span>
                        </span>
                        <span className="ml-auto text-[10px] capitalize text-muted-foreground">
                          {result.type}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
