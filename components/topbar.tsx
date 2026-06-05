"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Menu, Zap, AlertTriangle, Check, ChevronDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";

export function TopBar({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const { sidebarOpen, setMobileMenuOpen, currentTeamId, setCurrentTeamId } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: notificationsRaw } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const notifications = Array.isArray(notificationsRaw) ? notificationsRaw : [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const currentTeam = teams?.find((t: any) => t.id === currentTeamId);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAll: true }),
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Marked all as read");
    }
  }

  async function markOneRead(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  return (
    <header
      className={cn(
        "fixed top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6 transition-all duration-300",
        sidebarOpen ? "left-64 right-0" : "left-16 right-0"
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {teams?.length > 0 && (
          <div className="relative" ref={teamRef}>
            <button
              onClick={() => setTeamOpen(!teamOpen)}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              aria-haspopup="listbox"
              aria-expanded={teamOpen}
              aria-label={`Current team: ${currentTeam?.name ?? "Select team"}`}
            >
              <Zap size={14} className="text-primary" />
              {currentTeam?.name ?? "Select Team"}
              <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", teamOpen && "rotate-180")} />
            </button>
            {teamOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-border bg-popover p-1 shadow-xl z-50"
                role="listbox"
                aria-label="Teams"
              >
                {teams.map((team: any) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setCurrentTeamId(team.id);
                      setTeamOpen(false);
                    }}
                    role="option"
                    aria-selected={currentTeamId === team.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      currentTeamId === team.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Zap size={14} />
                    {team.name}
                    {currentTeamId === team.id && <Check size={14} className="ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Notifications, ${unreadCount} unread`}
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover p-2 shadow-xl z-50">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-medium text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
              {notifications.slice(0, 5).map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markOneRead(n.id);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                    !n.isRead && "bg-primary/5"
                  )}
                >
                  {n.type === "alert" ? (
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-primary" />
                  ) : (
                    <Zap size={14} className="mt-0.5 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="hidden text-sm font-medium text-foreground md:block">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
}
