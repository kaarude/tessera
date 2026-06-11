// Shared types for client-side code that displays API responses.
// Kept loose on purpose — these match the Prisma `select` shapes but without
// the Prisma-specific bits (Date stays Date, not Prisma's Date wrapper).

export type Me = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  theme?: string | null;
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
  memberships: { team: { id: string; name: string } }[];
  userRoles: {
    role: {
      id: string;
      name: string;
      teamId: string | null;
      permissions: { id: string; permission: string }[];
    };
  }[];
};

export type Team = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  teamId: string | null;
  isPlatform: boolean;
  permissions: { id: string; permission: string }[];
  team?: { id: string; name: string } | null;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  mustChangePassword: boolean;
  memberships: { team: { id: string; name: string } }[];
  userRoles: { role: { id: string; name: string; teamId: string | null } }[];
};

export type Note = {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  teamId: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string };
  team: { id: string; name: string } | null;
  shares: {
    id: string;
    userId: string | null;
    teamId: string | null;
    user: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
  }[];
  attachments: {
    id: string;
    noteId: string;
    filename: string;
    s3Key: string;
    mimeType: string;
    size: number;
    uploaderId: string;
    createdAt: string;
  }[];
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assigneeId: string | null;
  teamId: string;
  boardId: string;
  columnId: string;
  position: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  board: { id: string; name: string };
  column: { id: string; name: string };
  creator: { id: string; name: string };
};

export type TaskBoard = {
  id: string;
  name: string;
  teamId: string;
  columns: { id: string; name: string; position: number }[];
  team?: { id: string; name: string };
};

export type TaskColumn = { id: string; name: string; position: number };

export type CalendarEntry = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isAllDay: boolean;
  userId: string;
  teamId: string | null;
  assignedToId: string | null;
  user: { id: string; name: string };
  team: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  teamId: string | null;
  metadata: unknown;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
  actor: { id: string; name: string; email: string };
  team: { id: string; name: string } | null;
};
