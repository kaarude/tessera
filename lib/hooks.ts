"use client";

import { useEffect, useRef } from "react";

export function useKeyboardShortcuts(
  shortcuts: Record<string, (e: KeyboardEvent) => void>,
) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = `${e.metaKey || e.ctrlKey ? "Cmd+" : ""}${e.shiftKey ? "Shift+" : ""}${e.key}`;
      const handler = shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const closeBtn = container.querySelector(
          "[data-modal-close]",
        ) as HTMLElement;
        closeBtn?.click();
      }
    }

    container.addEventListener("keydown", handleTab);
    container.addEventListener("keydown", handleEsc);
    return () => {
      container.removeEventListener("keydown", handleTab);
      container.removeEventListener("keydown", handleEsc);
    };
  }, [active]);

  return ref;
}

export function useBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
