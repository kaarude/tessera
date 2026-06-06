type NoteAccess = {
  ownerId: string;
  teamId: string | null;
  isPrivate: boolean;
  shares: { userId: string | null; teamId: string | null }[];
};

export function canReadNote(
  note: NoteAccess,
  userId: string,
  teamIds: string[],
) {
  return (
    note.ownerId === userId ||
    note.shares.some(
      (share) =>
        share.userId === userId ||
        (share.teamId !== null && teamIds.includes(share.teamId)),
    ) ||
    (!note.isPrivate &&
      note.teamId !== null &&
      teamIds.includes(note.teamId))
  );
}

export function requiresCurrentPassword(args: {
  actorId: string;
  targetId: string;
  actorIsAdmin: boolean;
}) {
  return args.actorId === args.targetId || !args.actorIsAdmin;
}

export function validateCalendarDates(
  startDate: string | Date,
  endDate?: string | Date | null,
) {
  return !endDate || new Date(endDate) >= new Date(startDate);
}
