"use client";

import { Suspense, use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";

type ViewMode = "month" | "week" | "day";

import { toLocalInput } from "@/lib/datetime";

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <CalendarPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function CalendarPageContent({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const createRequested = use(searchParams).create === "1";
  const { currentTeamId } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showCreate, setShowCreate] = useState(createRequested);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const queryClient = useQueryClient();

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    isAllDay: false,
    recurrenceRule: "",
    recurrenceEnd: "",
  });

  const { data: events } = useQuery({
    queryKey: ["calendar", currentTeamId, currentDate, viewMode],
    queryFn: async () => {
      let start: Date, end: Date;
      if (viewMode === "month") {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      } else if (viewMode === "week") {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        // Day view — fresh Date instances to avoid mutating React state.
        const d = new Date(currentDate);
        start = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          0,
          0,
          0,
          0,
        );
        end = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
          23,
          59,
          59,
          999,
        );
      }
      const res = await fetch(
        `/api/calendar?teamId=${currentTeamId || ""}&start=${start.toISOString()}&end=${end.toISOString()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setShowCreate(false);
      toast.success("Event created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/calendar/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setSelectedEvent(null);
      setShowCreate(false);
      toast.success("Event updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setSelectedEvent(null);
      toast.success("Event deleted");
    },
  });

  const days = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else if (viewMode === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  }, [currentDate, viewMode]);

  function getEventsForDay(day: Date) {
    return (
      events?.filter((e: any) => isSameDay(new Date(e.startDate), day)) || []
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Calendar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule and manage team events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-muted p-1">
              {(["month", "week", "day"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    viewMode === v
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Today
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className={cn(buttonVariants({ size: "sm" }), "px-3")}
            >
              <Plus size={14} />
              Event
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = new Date(currentDate);
                if (viewMode === "day") next.setDate(next.getDate() - 1);
                else if (viewMode === "week") next.setDate(next.getDate() - 7);
                else next.setMonth(next.getMonth() - 1);
                setCurrentDate(next);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-lg font-semibold text-foreground min-w-[140px] text-center">
              {format(
                currentDate,
                viewMode === "day" ? "MMMM d, yyyy" : "MMMM yyyy",
              )}
            </h2>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                if (viewMode === "day") next.setDate(next.getDate() + 1);
                else if (viewMode === "week") next.setDate(next.getDate() + 7);
                else next.setMonth(next.getMonth() + 1);
                setCurrentDate(next);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month/Week Grid */}
        {viewMode !== "day" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {days.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setNewEvent((event) => ({
                        ...event,
                        startDate: toLocalInput(
                          new Date(
                            day.getFullYear(),
                            day.getMonth(),
                            day.getDate(),
                            9,
                          ),
                        ),
                        endDate: toLocalInput(
                          new Date(
                            day.getFullYear(),
                            day.getMonth(),
                            day.getDate(),
                            10,
                          ),
                        ),
                      }));
                      setShowCreate(true);
                    }}
                    className={cn(
                      "min-h-[100px] border-b border-r border-border p-2 transition-colors hover:bg-muted/50 cursor-pointer",
                      !isSameMonth(day, currentDate) &&
                        viewMode === "month" &&
                        "bg-muted/30 opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isToday(day)
                            ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            : "text-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event: any) => (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className={cn(
                            "block w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-left",
                            event.isAllDay
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {event.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === "day" && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {format(currentDate, "EEEE, MMMM d, yyyy")}
            </h3>
            <div className="space-y-2">
              {getEventsForDay(currentDate).map((event: any) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
                >
                  <div
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      event.isAllDay ? "bg-primary" : "bg-muted-foreground",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.isAllDay
                        ? "All day"
                        : format(new Date(event.startDate), "h:mm a")}
                      {event.endDate &&
                        ` - ${format(new Date(event.endDate), "h:mm a")}`}
                    </p>
                  </div>
                </button>
              ))}
              {!getEventsForDay(currentDate).length && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No events for this day
                </p>
              )}
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedEvent ? "Edit Event" : "New Event"}
                </h3>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setSelectedEvent(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={selectedEvent?.title || newEvent.title}
                  onChange={(e) =>
                    selectedEvent
                      ? setSelectedEvent({
                          ...selectedEvent,
                          title: e.target.value,
                        })
                      : setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  placeholder="Event title"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <textarea
                  value={selectedEvent?.description || newEvent.description}
                  onChange={(e) =>
                    selectedEvent
                      ? setSelectedEvent({
                          ...selectedEvent,
                          description: e.target.value,
                        })
                      : setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                  }
                  placeholder="Description"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Start
                    </label>
                    <input
                      type="datetime-local"
                      value={toLocalInput(
                        selectedEvent?.startDate ?? newEvent.startDate,
                      )}
                      onChange={(e) =>
                        selectedEvent
                          ? setSelectedEvent({
                              ...selectedEvent,
                              startDate: e.target.value,
                            })
                          : setNewEvent({
                              ...newEvent,
                              startDate: e.target.value,
                            })
                      }
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      End
                    </label>
                    <input
                      type="datetime-local"
                      value={toLocalInput(
                        selectedEvent?.endDate ?? newEvent.endDate,
                      )}
                      onChange={(e) =>
                        selectedEvent
                          ? setSelectedEvent({
                              ...selectedEvent,
                              endDate: e.target.value,
                            })
                          : setNewEvent({
                              ...newEvent,
                              endDate: e.target.value,
                            })
                      }
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={selectedEvent?.isAllDay || newEvent.isAllDay}
                    onChange={(e) =>
                      selectedEvent
                        ? setSelectedEvent({
                            ...selectedEvent,
                            isAllDay: e.target.checked,
                          })
                        : setNewEvent({
                            ...newEvent,
                            isAllDay: e.target.checked,
                          })
                    }
                    className="rounded border-border text-primary"
                  />
                  <label htmlFor="allDay" className="text-sm text-foreground">
                    All day
                  </label>
                </div>
                {!selectedEvent && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Repeat
                      </label>
                      <select
                        value={newEvent.recurrenceRule}
                        onChange={(event) =>
                          setNewEvent({
                            ...newEvent,
                            recurrenceRule: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Repeat until
                      </label>
                      <input
                        type="date"
                        value={newEvent.recurrenceEnd}
                        onChange={(event) =>
                          setNewEvent({
                            ...newEvent,
                            recurrenceEnd: event.target.value,
                          })
                        }
                        disabled={!newEvent.recurrenceRule}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  {selectedEvent ? (
                    <>
                      <button
                        onClick={() => {
                          const startIso = selectedEvent.startDate
                            ? new Date(selectedEvent.startDate).toISOString()
                            : selectedEvent.startDate;
                          const endIso = selectedEvent.endDate
                            ? new Date(selectedEvent.endDate).toISOString()
                            : null;
                          updateMutation.mutate({
                            id: selectedEvent.id,
                            title: selectedEvent.title,
                            description: selectedEvent.description,
                            startDate: startIso,
                            endDate: endIso,
                            isAllDay: selectedEvent.isAllDay,
                          });
                        }}
                        disabled={updateMutation.isPending}
                        className={cn(buttonVariants(), "flex-1 px-4")}
                      >
                        {updateMutation.isPending ? "Updating..." : "Update"}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(selectedEvent.id)}
                        className="flex items-center gap-1 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        // The form fields are local "YYYY-MM-DDTHH:mm" strings —
                        // convert to ISO before posting. Date constructor
                        // treats them as local time, so .toISOString() is
                        // correct.
                        const startIso = newEvent.startDate
                          ? new Date(newEvent.startDate).toISOString()
                          : "";
                        const endIso = newEvent.endDate
                          ? new Date(newEvent.endDate).toISOString()
                          : "";
                        createMutation.mutate({
                          ...newEvent,
                          startDate: startIso,
                          endDate: endIso || null,
                          teamId: currentTeamId,
                          recurrenceRule: newEvent.recurrenceRule || null,
                          recurrenceEnd: newEvent.recurrenceEnd
                            ? new Date(
                                `${newEvent.recurrenceEnd}T23:59:59`,
                              ).toISOString()
                            : null,
                        });
                      }}
                      disabled={
                        !newEvent.title ||
                        !newEvent.startDate ||
                        createMutation.isPending
                      }
                      className={cn(buttonVariants(), "w-full px-4")}
                    >
                      {createMutation.isPending
                        ? "Creating..."
                        : "Create Event"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
