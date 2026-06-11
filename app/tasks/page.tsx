"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Plus,
  MoreHorizontal,
  Clock,
  User,
  Users,
  Trash2,
  X,
  Inbox,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { buttonVariants } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  assignee?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  columnId: string;
  position: number;
}

interface Column {
  id: string;
  name: string;
  position: number;
}

function TaskCard({
  task,
  onMenuClick,
}: {
  task: Task;
  onMenuClick: (task: Task, e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "Task", task },
  });

  const priorityColors: Record<string, string> = {
    high: "bg-destructive/15 text-destructive border-destructive/25",
    medium: "bg-amber-400/10 text-amber-400 border-amber-400/25",
    low: "bg-emerald-400/10 text-emerald-400 border-emerald-400/25",
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenuClick(task, e);
      }}
      className={cn(
        "group relative cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onMenuClick(task, e);
        }}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        aria-label="Task options"
        title="Options"
      >
        <MoreHorizontal size={14} />
      </button>
      <div className="mb-2 flex items-start justify-between pr-6">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            priorityColors[task.priority] || priorityColors.medium,
          )}
        >
          {task.priority}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        {task.dueDate ? (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            {new Date(task.dueDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        ) : (
          <span />
        )}
        {task.assignee ? (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary"
            title={task.assignee.name}
          >
            {task.assignee.name?.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">
            <User size={10} />
          </div>
        )}
      </div>
    </div>
  );
}

function BoardColumn({
  column,
  tasks,
  onMenuClick,
  onAddTask,
}: {
  column: Column;
  tasks: Task[];
  onMenuClick: (task: Task, e: React.MouseEvent) => void;
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "Column", column },
  });

  return (
    <div className="w-72 shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{column.name}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-col gap-2 rounded-xl p-2 transition-colors",
          isOver ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/40",
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onMenuClick={onMenuClick} />
        ))}
        <button
          onClick={onAddTask}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <Plus size={14} />
          Add task
        </button>
      </div>
    </div>
  );
}

export default function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const createRequested = use(searchParams).create === "1";
  const { currentTeamId } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [menuTask, setMenuTask] = useState<Task | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showCreate, setShowCreate] = useState(createRequested);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    columnId: "",
  });

  const {
    data: boards,
    isLoading: boardsLoading,
    isError: boardsError,
  } = useQuery({
    queryKey: ["boards", currentTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/taskboards?teamId=${currentTeamId || ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load taskboard");
      return data;
    },
    enabled: !!currentTeamId,
  });

  const activeBoard = boards?.[0];

  const { data: tasksRaw } = useQuery({
    queryKey: ["tasks", currentTeamId, activeBoard?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/tasks?teamId=${currentTeamId || ""}&boardId=${activeBoard?.id || ""}`,
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeBoard,
  });
  const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];

  const { data: users } = useQuery({
    queryKey: ["team-members", currentTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/team-members?teamId=${currentTeamId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentTeamId,
  });

  const { data: teamsList } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const columns: Column[] = activeBoard?.columns || [];

  const createBoardMutation = useMutation({
    mutationFn: async () => {
      if (!currentTeamId) throw new Error("Select a team first");
      const res = await fetch("/api/taskboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Team taskboard",
          teamId: currentTeamId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create taskboard");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", currentTeamId] });
      toast.success("Taskboard created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreate(false);
      toast.success("Task created");
    },
  });

  function handleDragStart(event: DragStartEvent) {
    const t = tasks.find((t: Task) => t.id === event.active.id);
    if (t) setActiveTask(t);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t: Task) => t.id === activeId);
    if (!activeTaskItem) return;

    const targetColumn = columns.find((c: Column) => c.id === overId);
    if (targetColumn && targetColumn.id !== activeTaskItem.columnId) {
      updateTaskMutation.mutate({ id: activeId, columnId: targetColumn.id });
    }
  }

  const handleMenuClick = useCallback((task: Task, e: React.MouseEvent) => {
    setMenuTask(task);
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  function getTasksForColumn(columnId: string) {
    return (
      tasks
        ?.filter((t: Task) => t.columnId === columnId)
        .sort((a: Task, b: Task) => a.position - b.position) || []
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Taskboard
            </h1>
          </div>
          {activeBoard && (
            <button
              onClick={() => setShowCreate(true)}
              className={cn(buttonVariants({ size: "lg" }), "px-4")}
            >
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>

        {boardsLoading && (
          <div className="h-52 animate-pulse rounded-xl bg-muted" />
        )}

        {boardsError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm font-medium text-destructive">
              The taskboard could not be loaded.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check the server connection, then refresh this page.
            </p>
          </div>
        )}

        {!boardsLoading && !boardsError && !activeBoard && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Inbox
              size={32}
              className="mx-auto mb-3 text-muted-foreground/40"
            />
            <h2 className="text-base font-semibold text-foreground">
              Create this team&apos;s taskboard
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              A taskboard provides To Do, In Progress, Review, and Done columns.
              Create it before adding the team&apos;s first task.
            </p>
            <button
              onClick={() => createBoardMutation.mutate()}
              disabled={!currentTeamId || createBoardMutation.isPending}
              className={cn(buttonVariants(), "mt-4 px-4")}
            >
              <Plus size={16} />
              {createBoardMutation.isPending
                ? "Creating taskboard..."
                : currentTeamId
                  ? "Create taskboard"
                  : "Select a team first"}
            </button>
          </div>
        )}

        {activeBoard && (
          <DndContext
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {columns.map((column: Column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={getTasksForColumn(column.id)}
                  onMenuClick={handleMenuClick}
                  onAddTask={() => {
                    setNewTask({ ...newTask, columnId: column.id });
                    setShowCreate(true);
                  }}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeTask ? (
                <div className="rounded-lg border border-primary/30 bg-card p-3 shadow-sm opacity-90">
                  <p className="text-sm font-medium text-foreground">
                    {activeTask.title}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Task Options Menu */}
        {menuTask && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuTask(null)}
              aria-hidden="true"
            />
            <div
              className="fixed z-50 w-56 rounded-xl border border-border bg-popover p-1 shadow-sm"
              style={{
                top: Math.min(menuPos.y, window.innerHeight - 300),
                left: Math.min(menuPos.x, window.innerWidth - 230),
              }}
              role="menu"
              aria-label="Task options"
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Assign to user
              </div>
              {users?.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => {
                    updateTaskMutation.mutate({
                      id: menuTask.id,
                      assigneeId: user.id,
                    });
                    setMenuTask(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                  role="menuitem"
                >
                  <User size={14} />
                  {user.name}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Move to team
              </div>
              {teamsList?.map((team: any) => (
                <button
                  key={team.id}
                  onClick={() => {
                    updateTaskMutation.mutate({
                      id: menuTask.id,
                      teamId: team.id,
                    });
                    setMenuTask(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                  role="menuitem"
                >
                  <Users size={14} />
                  {team.name}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => {
                  if (confirm("Delete this task? This cannot be undone.")) {
                    fetch(`/api/tasks/${menuTask.id}`, {
                      method: "DELETE",
                    })
                      .then((res) => {
                        if (!res.ok) throw new Error("Failed to delete");
                        queryClient.invalidateQueries({ queryKey: ["tasks"] });
                        toast.success("Task deleted");
                      })
                      .catch(() => toast.error("Failed to delete task"));
                  }
                  setMenuTask(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                role="menuitem"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </>
        )}

        {/* Create Modal */}
        {showCreate && activeBoard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Create task"
          >
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  New Task
                </h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                  data-modal-close=""
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    placeholder="What needs to be done?"
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    placeholder="Add details..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      createTaskMutation.mutate({
                        ...newTask,
                        teamId: currentTeamId,
                        boardId: activeBoard?.id,
                        columnId: newTask.columnId || columns[0]?.id,
                      })
                    }
                    disabled={
                      !newTask.title.trim() || createTaskMutation.isPending
                    }
                    className={cn(buttonVariants(), "flex-1 px-4")}
                  >
                    {createTaskMutation.isPending
                      ? "Creating..."
                      : "Create Task"}
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
          </div>
        )}
      </div>
    </AppShell>
  );
}
