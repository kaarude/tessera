"use client";

import { useEffect, useState, useCallback } from "react";
import { X, CornerDownLeft, Command } from "lucide-react";

const SHORTCUTS = [
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Cmd", "N"], description: "New note" },
  { keys: ["Cmd", "T"], description: "New task" },
  { keys: ["Cmd", "C"], description: "New calendar event" },
  { keys: ["Esc"], description: "Close modal / dropdown" },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Keyboard shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={key}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-foreground"
                  >
                    {key === "Cmd" ? (
                      <Command size={12} />
                    ) : key === "Enter" || key === "Esc" ? (
                      key
                    ) : (
                      key
                    )}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px]">
            ?
          </kbd>{" "}
          anywhere to toggle this dialog.
        </p>
      </div>
    </div>
  );
}
