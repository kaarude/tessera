import { z } from "zod";

/**
 * Request-body Zod schemas for Tessera's API routes. Centralised here so
 * that:
 *
 *   1. Each route can import the schema and call `safeParse` on the body.
 *   2. The unit tests in `tests/unit/schemas.test.ts` can exercise them
 *      without needing a running server or database.
 *
 * The schemas are intentionally strict — they reject extra keys with
 * `.strict()` so a typo in a frontend form is caught at the boundary.
 */

const cuid = z.string().cuid();

const NOTE_PERMS = [
  "notes:create",
  "notes:edit_own",
  "notes:edit_shared",
  "notes:delete_own",
  "notes:delete_shared",
  "notes:view_private",
  "notes:view_shared",
  "notes:share_team",
  "notes:share_users",
  "notes:download",
  "notes:upload_attachments",
  "notes:delete_attachments",
] as const;

const CAL_PERMS = [
  "calendar:create",
  "calendar:edit_own",
  "calendar:edit_others",
  "calendar:delete_own",
  "calendar:delete_others",
  "calendar:view_team",
  "calendar:assign_users",
  "calendar:assign_teams",
] as const;

const TASK_PERMS = [
  "tasks:create",
  "tasks:edit_own",
  "tasks:edit_others",
  "tasks:delete_own",
  "tasks:delete_others",
  "tasks:move_columns",
  "tasks:reassign_users",
  "tasks:reassign_teams",
  "tasks:view_team",
] as const;

const PLATFORM_PERMS = [
  "users:create",
  "users:edit",
  "users:delete",
  "teams:create",
  "teams:edit",
  "teams:delete",
  "roles:create",
  "roles:edit",
  "roles:delete",
  "admin:grant",
] as const;

const AUDIT_PERMS = ["audit:view_team", "audit:view_all"] as const;

export const ALL_PERMISSION_STRINGS = [
  ...PLATFORM_PERMS,
  ...NOTE_PERMS,
  ...CAL_PERMS,
  ...TASK_PERMS,
  ...AUDIT_PERMS,
] as const;

export const NoteCreateBody = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().max(500_000).default(""),
    teamId: cuid.nullable().optional(),
    isPrivate: z.boolean().optional(),
  })
  .strict();

export const NoteUpdateBody = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().max(500_000).optional(),
    isPrivate: z.boolean().optional(),
    teamId: cuid.nullable().optional(),
  })
  .strict();

export const TaskCreateBody = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(20_000).default(""),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    dueDate: z.string().datetime().nullable().optional(),
    assigneeId: cuid.nullable().optional(),
    teamId: cuid,
    boardId: cuid,
    columnId: cuid,
    position: z.number().int().min(0).default(0),
    recurrenceRule: z
      .enum(["daily", "weekly", "monthly"])
      .nullable()
      .optional(),
    recurrenceEnd: z.string().datetime().nullable().optional(),
  })
  .strict();

export const TaskUpdateBody = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(20_000).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    assigneeId: cuid.nullable().optional(),
    teamId: cuid.optional(),
    boardId: cuid.optional(),
    columnId: cuid.optional(),
    position: z.number().int().min(0).optional(),
    status: z.string().max(50).optional(),
    recurrenceRule: z
      .enum(["daily", "weekly", "monthly"])
      .nullable()
      .optional(),
    recurrenceEnd: z.string().datetime().nullable().optional(),
  })
  .strict();

export const TeamCreateBody = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
  })
  .strict();

export const RoleCreateBody = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    teamId: cuid.nullable().optional(),
    permissions: z
      .array(z.enum(ALL_PERMISSION_STRINGS))
      .max(ALL_PERMISSION_STRINGS.length)
      .default([]),
  })
  .strict();

export const RoleUpdateBody = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
    permissions: z
      .array(z.enum(ALL_PERMISSION_STRINGS))
      .max(ALL_PERMISSION_STRINGS.length)
      .optional(),
  })
  .strict();

export const UserCreateBody = z
  .object({
    email: z
      .string()
      .email()
      .max(200)
      .transform((v) => v.toLowerCase()),
    name: z.string().min(1).max(100),
    password: z.string().min(8).max(200),
    isAdmin: z.boolean().default(false),
    teamIds: z.array(cuid).max(50).default([]),
    roleIds: z.array(cuid).max(50).default([]),
  })
  .strict();

export const CalendarCreateBody = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(10_000).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable().optional(),
    isAllDay: z.boolean().default(false),
    teamId: cuid.nullable().optional(),
    assignedToId: cuid.nullable().optional(),
    recurrenceRule: z
      .enum(["daily", "weekly", "monthly"])
      .nullable()
      .optional(),
    recurrenceEnd: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "endDate must not be before startDate",
    path: ["endDate"],
  });

export const CalendarUpdateBody = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(10_000).nullable().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
    isAllDay: z.boolean().optional(),
    teamId: cuid.nullable().optional(),
    assignedToId: cuid.nullable().optional(),
    recurrenceRule: z
      .enum(["daily", "weekly", "monthly"])
      .nullable()
      .optional(),
    recurrenceEnd: z.string().datetime().nullable().optional(),
  })
  .strict();

export const ShareBody = z
  .object({
    teamId: cuid.nullable().optional(),
    userId: cuid.nullable().optional(),
  })
  .strict()
  .refine((data) => Boolean(data.teamId) !== Boolean(data.userId), {
    message: "Provide exactly one of teamId or userId",
  });
