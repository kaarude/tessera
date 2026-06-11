"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Users,
  Shield,
  ClipboardList,
  Settings,
  KeyRound,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { useEffect, useRef } from "react";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Taskboard", icon: CheckSquare },
  { href: "/teams", label: "Teams", icon: Users },
];

const adminNavItems = [
  { href: "/roles", label: "Roles", icon: Shield },
  { href: "/audit", label: "Audit Logs", icon: ClipboardList },
  { href: "/users", label: "Users", icon: Users },
  { href: "/security", label: "Security Center", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: Infinity,
  });

  const isAdmin = !!me?.isAdmin;

  const navItems = isAdmin ? [...mainNavItems, ...adminNavItems] : mainNavItems;
  const navRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = navRef.current;
    if (!list) return;

    function handleKeyDown(e: KeyboardEvent) {
      const focusable = Array.from(
        list!.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ).filter((el) => el.offsetParent !== null);

      const idx = focusable.indexOf(document.activeElement as HTMLElement);
      if (idx === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = focusable[idx + 1] || focusable[0];
        next?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = focusable[idx - 1] || focusable[focusable.length - 1];
        prev?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        focusable[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        focusable[focusable.length - 1]?.focus();
      }
    }

    list.addEventListener("keydown", handleKeyDown);
    return () => list.removeEventListener("keydown", handleKeyDown);
  }, [navItems.length]);

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-0 top-0 z-[60] -translate-y-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-out",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 transition-opacity duration-200",
              sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none w-0",
            )}
          >
            <Logo size={32} className="text-foreground" />
            <span className="font-semibold tracking-tight text-foreground">
              Tessera
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              !sidebarOpen && "mx-auto",
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto py-4 scrollbar-thin"
          aria-label="Main navigation"
        >
          <ul className="space-y-1 px-2" ref={navRef}>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      !sidebarOpen && "justify-center px-2",
                    )}
                    title={sidebarOpen ? undefined : item.label}
                    aria-label={sidebarOpen ? undefined : item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon
                      size={18}
                      className={cn("shrink-0", isActive && "text-foreground")}
                      aria-hidden="true"
                    />
                    {sidebarOpen && (
                      <span className="flex-1">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-2">
          <Link
            href="/integrations"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              !sidebarOpen && "justify-center px-2",
            )}
            title={!sidebarOpen ? "Integrations" : undefined}
          >
            <KeyRound size={18} aria-hidden="true" />
            {sidebarOpen && <span>Integrations</span>}
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              !sidebarOpen && "justify-center px-2",
            )}
            title={!sidebarOpen ? "Settings" : undefined}
            aria-label={!sidebarOpen ? "Settings" : undefined}
          >
            <Settings size={18} aria-hidden="true" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              !sidebarOpen && "justify-center px-2",
            )}
            title={!sidebarOpen ? "Logout" : undefined}
            aria-label="Logout"
          >
            <LogOut size={18} aria-hidden="true" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
