/**
 * Pure authorization policy helpers. These functions take pre-computed
 * inputs (no DB access) and return booleans or throw `Error("Forbidden")`.
 *
 * The `PolicyUser` shape is what `withRoute` builds from the session
 * once; the route handlers call into these functions instead of doing
 * `if (user.isAdmin) ...` checks inline.
 *
 * All functions are pure and side-effect-free, which makes them easy to
 * unit-test (see `tests/unit/policy.test.ts`).
 */

export interface PolicyUser {
  id: string;
  isAdmin: boolean;
  teamIds: Set<string>;
  permissions: Set<string>;
}

/** Build a `PolicyUser` from a `SessionUser` plus the team context. */
export function toPolicyUser(
  user: {
    id: string;
    isAdmin: boolean;
    memberships: { teamId: string }[];
    userRoles: { role: { permissions: { permission: string }[] } }[];
  },
  teamId?: string,
): PolicyUser {
  // If a specific team is in scope, only the permissions granted by
  // roles in that team count. If no team is in scope, fall back to the
  // union of all role permissions.
  const teamRoles = teamId
    ? user.userRoles.filter((ur) => (ur.role as { teamId?: string | null }).teamId === teamId)
    : user.userRoles;
  const permissions = new Set<string>();
  for (const ur of teamRoles) {
    for (const p of ur.role.permissions) permissions.add(p.permission);
  }
  // Platform-level roles (isPlatform=true) apply everywhere.
  for (const ur of user.userRoles) {
    if ((ur.role as { isPlatform?: boolean }).isPlatform) {
      for (const p of ur.role.permissions) permissions.add(p.permission);
    }
  }
  return {
    id: user.id,
    isAdmin: user.isAdmin,
    teamIds: new Set(user.memberships.map((m) => m.teamId)),
    permissions,
  };
}

/** Returns true if the user is admin or has the named permission. */
export function hasPolicyPermission(user: PolicyUser, permission: string): boolean {
  return user.isAdmin || user.permissions.has(permission);
}

/** Throws `Error("Forbidden")` if the user is not a member of the team. */
export function requireTeamAccess(user: PolicyUser, teamId: string): void {
  if (!user.isAdmin && !user.teamIds.has(teamId)) {
    throw new Error("Forbidden");
  }
}

interface NotePolicyRecord {
  ownerId: string;
  teamId: string | null;
  isPrivate: boolean;
  shares: Array<{ userId: string | null; teamId: string | null }>;
}

/**
 * Note access policy. A user can read a note if:
 *   - they own it
 *   - it's shared with them directly (and they have notes:view_shared)
 *   - it's shared with a team they belong to (and they have notes:view_shared)
 *   - it's a non-private team note in a team they belong to (and they have notes:view_shared)
 *
 * Admins always pass.
 */
export function canAccessNote(
  user: PolicyUser,
  note: NotePolicyRecord,
): boolean {
  if (user.isAdmin || note.ownerId === user.id) return true;

  const directlyShared = note.shares.some(
    (share) =>
      share.userId === user.id ||
      (share.teamId !== null && user.teamIds.has(share.teamId)),
  );
  if (directlyShared) return hasPolicyPermission(user, "notes:view_shared");

  return (
    !note.isPrivate &&
    note.teamId !== null &&
    user.teamIds.has(note.teamId) &&
    hasPolicyPermission(user, "notes:view_shared")
  );
}

/** Only the owner or an admin can edit/delete a note they own. */
export function canManageNote(
  user: Pick<PolicyUser, "id" | "isAdmin">,
  note: { ownerId: string },
): boolean {
  return user.isAdmin || note.ownerId === user.id;
}

/**
 * Password change policy:
 *   - a user can change their own password without `forceReset`
 *   - only an admin can change another user's password, and only with
 *     `forceReset: true`
 */
export function canChangePassword(
  user: Pick<PolicyUser, "id" | "isAdmin">,
  targetUserId: string,
  forceReset: boolean,
): boolean {
  if (targetUserId === user.id) return true;
  return user.isAdmin && forceReset;
}

/**
 * Task edit policy. Reassignment to a different user / team / board /
 * column / group requires the corresponding `tasks:reassign_*` or
 * `tasks:move_*` permission; editing fields like title/description
 * requires `tasks:edit_own` (or `tasks:edit_others` if not the
 * creator/assignee).
 */
export function canEditTask(
  user: PolicyUser,
  task: { createdById: string; assigneeId: string | null; teamId: string },
  changedFields: string[],
): boolean {
  if (user.isAdmin) return true;
  if (!user.teamIds.has(task.teamId)) return false;

  const protectedFields: Record<string, string> = {
    assigneeId: "tasks:reassign_users",
    teamId: "tasks:reassign_teams",
    groupId: "tasks:move_groups",
    boardId: "tasks:move_columns",
    columnId: "tasks:move_columns",
    position: "tasks:move_columns",
  };

  for (const field of changedFields) {
    const permission = protectedFields[field];
    if (permission && !hasPolicyPermission(user, permission)) return false;
  }

  if (task.createdById === user.id || task.assigneeId === user.id) {
    return hasPolicyPermission(user, "tasks:edit_own");
  }
  return hasPolicyPermission(user, "tasks:edit_others");
}

export function canEditCalendarEntry(
  user: PolicyUser,
  entry: { userId: string; teamId: string | null },
): boolean {
  if (user.isAdmin) return true;
  if (entry.teamId && !user.teamIds.has(entry.teamId)) return false;
  return entry.userId === user.id
    ? hasPolicyPermission(user, "calendar:edit_own")
    : hasPolicyPermission(user, "calendar:edit_others");
}

/** Throws if the share target is ambiguous. */
export function validateNoteShareTarget(
  teamId: string | null,
  userId: string | null,
): void {
  if (Boolean(teamId) === Boolean(userId)) {
    throw new Error("A share must have exactly one target");
  }
}

/**
 * Throws if a task's (teamId, boardId, columnId, groupId) is internally
 * inconsistent. The same invariant is enforced at the database level
 * by composite foreign keys (see migration
 * `20260606122000_enforce_tenant_relations`).
 */
export function validateTaskScope(scope: {
  teamId: string;
  boardTeamId: string;
  boardId: string;
  columnBoardId: string;
  groupTeamId: string | null;
}): void {
  if (scope.boardTeamId !== scope.teamId) {
    throw new Error("Task board must belong to the same team");
  }
  if (scope.columnBoardId !== scope.boardId) {
    throw new Error("Task column must belong to the same board");
  }
  if (scope.groupTeamId !== null && scope.groupTeamId !== scope.teamId) {
    throw new Error("Task group must belong to the same team");
  }
}
