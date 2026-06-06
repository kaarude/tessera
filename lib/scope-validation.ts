import { prisma } from "./prisma";
import { apiError } from "./api-error";
import { validateTaskScope } from "./policy";

/**
 * DB-backed scope checks. The pure policy functions in `lib/policy.ts`
 * take pre-computed data; these helpers do the lookups and then call
 * into the policy module for the actual check.
 *
 * Throws via `apiError(400, ...)` so the route wrapper can let them
 * bubble up unchanged.
 */

export async function validateGroupScope(
  groupId: string | null | undefined,
  teamId: string | null,
): Promise<void> {
  if (!groupId) return;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.teamId !== teamId) {
    throw apiError(400, "Group must belong to the same team");
  }
}

export async function validateAssigneeScope(
  assigneeId: string | null | undefined,
  teamId: string,
): Promise<void> {
  if (!assigneeId) return;
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: assigneeId, teamId } },
  });
  if (!membership) {
    throw apiError(400, "Assignee must belong to the task team");
  }
}

export async function validateTaskRelations(args: {
  teamId: string;
  boardId: string;
  columnId: string;
  groupId?: string | null;
  assigneeId?: string | null;
}): Promise<void> {
  const [board, column, group] = await Promise.all([
    prisma.taskBoard.findUnique({ where: { id: args.boardId } }),
    prisma.taskColumn.findUnique({ where: { id: args.columnId } }),
    args.groupId
      ? prisma.group.findUnique({ where: { id: args.groupId } })
      : Promise.resolve(null),
  ]);
  if (!board || !column) {
    throw apiError(400, "Invalid board or column");
  }
  validateTaskScope({
    teamId: args.teamId,
    boardTeamId: board.teamId,
    boardId: board.id,
    columnBoardId: column.boardId,
    groupTeamId: group?.teamId ?? null,
  });
  await validateAssigneeScope(args.assigneeId, args.teamId);
}
