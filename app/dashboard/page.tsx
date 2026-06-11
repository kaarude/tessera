"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  CheckSquare,
  Users,
  Clock,
  AlertTriangle,
  Inbox,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { useKeyboardShortcuts } from "@/lib/hooks";
import type { Me, Note, Task, CalendarEntry, Notification } from "@/lib/types";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { currentTeamId } = useAppStore();

  useKeyboardShortcuts({
    "Cmd+n": () => {
      window.location.href = "/notes";
    },
    "Cmd+t": () => {
      window.location.href = "/tasks";
    },
    "Cmd+c": () => {
      window.location.href = "/calendar";
    },
  });

  const { data: me } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: notesRaw } = useQuery<Note[]>({
    queryKey: ["notes", currentTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/notes?teamId=${currentTeamId || ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    enabled: !!currentTeamId,
  });
  const notes = Array.isArray(notesRaw) ? notesRaw : [];

  const { data: calendarRaw } = useQuery<CalendarEntry[]>({
    queryKey: ["calendar", currentTeamId],
    queryFn: async () => {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const res = await fetch(
        `/api/calendar?teamId=${currentTeamId || ""}&start=${now.toISOString()}&end=${end.toISOString()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    enabled: !!currentTeamId,
  });
  const calendar = Array.isArray(calendarRaw) ? calendarRaw : [];

  const { data: tasksRaw } = useQuery<Task[]>({
    queryKey: ["tasks", currentTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?teamId=${currentTeamId || ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    enabled: !!currentTeamId,
  });
  const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];

  const { data: notificationsRaw } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const notifications = Array.isArray(notificationsRaw) ? notificationsRaw : [];

  const unreadNotifications = notifications.filter(
    (n: Notification) => !n.isRead,
  );
  const overdueTasks = tasks.filter((t: Task) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && t.status !== "done";
  });

  const hasAttention =
    unreadNotifications.length > 0 || overdueTasks.length > 0;

  const stats = [
    { label: "Notes", value: notes.length, icon: FileText, href: "/notes" },
    {
      label: "Events",
      value: calendar.length,
      icon: Calendar,
      href: "/calendar",
    },
    {
      label: "Active",
      value: tasks.filter((t: Task) => t.status !== "done").length,
      icon: CheckSquare,
      href: "/tasks",
    },
    {
      label: "Teams",
      value: me?.memberships?.length || 0,
      icon: Users,
      href: "/teams",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {me?.name?.split(" ")[0] || "there"}
            </h1>
          </div>
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Cmd
            </kbd>
            <span>+</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              N
            </kbd>
            <span className="ml-1">New note</span>
            <span className="mx-1 text-muted-foreground/50">·</span>
            <span className="text-[10px]">
              Press{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">
                ?
              </kbd>{" "}
              for all shortcuts
            </span>
          </div>
        </div>

        {/* Attention Section */}
        {hasAttention && (
          <div className="space-y-2">
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                <Clock size={16} className="shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-destructive">
                    {overdueTasks.length} overdue task
                    {overdueTasks.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    on the Taskboard
                  </span>
                </div>
                <Link
                  href="/tasks"
                  className="shrink-0 text-xs font-medium text-destructive hover:underline"
                >
                  View
                </Link>
              </div>
            )}
            {unreadNotifications.map((n: Notification) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
              >
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
                <button
                  onClick={async () => {
                    await fetch("/api/notifications", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: n.id }),
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["notifications"],
                    });
                  }}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Mark as read"
                >
                  Mark read
                </button>
              </div>
            ))}
          </div>
        )}

        {/* First-run onboarding */}
        {me?.memberships?.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-foreground">
                  Welcome to Tessera
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tessera is organized around teams. Create your first team to
                  start adding notes, tasks, and calendar events.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/teams"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Plus size={14} />
                    Create a team
                  </Link>
                  <a
                    href="https://github.com/kaarude/tessera#quick-start-self-hosted"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Read the docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30"
            >
              <stat.icon
                size={18}
                className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
              />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/notes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Plus size={14} />
            New Note
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <CheckSquare size={14} />
            New Task
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Calendar size={14} />
            New Event
          </Link>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Notes */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Recent Notes
              </h2>
              <Link
                href="/notes"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-1">
              {notes.length > 0 ? (
                notes.slice(0, 6).map((note: Note) => (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted group"
                  >
                    <FileText
                      size={15}
                      className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {note.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {note.content?.slice(0, 60) || "No content"}
                      </span>
                    </div>
                    {note.isPrivate && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Private
                      </span>
                    )}
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border py-8 text-center">
                  <Inbox
                    size={24}
                    className="mx-auto mb-2 text-muted-foreground/40"
                  />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <Link
                    href="/notes"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Create your first note
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Upcoming
              </h2>
              <Link
                href="/calendar"
                className="text-xs font-medium text-primary hover:underline"
              >
                Calendar
              </Link>
            </div>
            <div className="space-y-1">
              {calendar.length > 0 ? (
                calendar.slice(0, 5).map((event: CalendarEntry) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                      <span className="text-[9px] font-bold uppercase leading-none">
                        {new Date(event.startDate).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                      <span className="text-sm font-bold leading-none">
                        {new Date(event.startDate).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {event.isAllDay
                          ? "All day"
                          : new Date(event.startDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border py-8 text-center">
                  <Calendar
                    size={24}
                    className="mx-auto mb-2 text-muted-foreground/40"
                  />
                  <p className="text-sm text-muted-foreground">
                    No upcoming events
                  </p>
                  <Link
                    href="/calendar"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    Add an event
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
