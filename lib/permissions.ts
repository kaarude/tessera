export const PLATFORM_PERMISSIONS = [
  "users:create",
  "users:edit",
  "users:delete",
  "teams:create",
  "teams:edit",
  "teams:delete",
  "groups:create",
  "groups:edit",
  "groups:delete",
  "roles:create",
  "roles:edit",
  "roles:delete",
  "admin:grant",
];

export const NOTE_PERMISSIONS = [
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
];

export const CALENDAR_PERMISSIONS = [
  "calendar:create",
  "calendar:edit_own",
  "calendar:edit_others",
  "calendar:delete_own",
  "calendar:delete_others",
  "calendar:view_team",
  "calendar:assign_users",
  "calendar:assign_teams",
];

export const TASK_PERMISSIONS = [
  "tasks:create",
  "tasks:edit_own",
  "tasks:edit_others",
  "tasks:delete_own",
  "tasks:delete_others",
  "tasks:move_columns",
  "tasks:reassign_users",
  "tasks:reassign_teams",
  "tasks:move_groups",
  "tasks:view_team",
  "tasks:view_group",
];

export const AUDIT_PERMISSIONS = [
  "audit:view_team",
  "audit:view_group",
  "audit:view_all",
];

export const ALL_PERMISSIONS = [
  ...PLATFORM_PERMISSIONS,
  ...NOTE_PERMISSIONS,
  ...CALENDAR_PERMISSIONS,
  ...TASK_PERMISSIONS,
  ...AUDIT_PERMISSIONS,
];
