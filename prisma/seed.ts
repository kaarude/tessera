import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Generate a random password that's printed to stdout at the end of
 * the seed. Avoids the classic "demo data ships with admin123" trap:
 * even if a self-hoster forgets to delete the seed users, an attacker
 * can't guess the credentials because they're randomly generated.
 */
function randomPassword(): string {
  return randomBytes(12).toString("base64url");
}

async function main() {
  // Clean slate
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskColumn.deleteMany();
  await prisma.taskBoard.deleteMany();
  await prisma.calendarEntry.deleteMany();
  await prisma.noteAttachment.deleteMany();
  await prisma.noteShare.deleteMany();
  await prisma.note.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // Create admin
  //
  // If TESSERA_SEED_PASSWORD is set, use it as a deterministic password
  // and skip the mustChangePassword flag. This is intended for tests
  // (Playwright smoke, CI ephemeral DBs) and for self-hosters who
  // explicitly want a known initial password. In production the env
  // should be unset and a random password is generated and printed.
  const seedPassword = process.env.TESSERA_SEED_PASSWORD;
  const adminPassword = seedPassword ?? randomPassword();
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@tessera.app",
      name: "System Administrator",
      passwordHash: adminPasswordHash,
      isAdmin: true,
      mustChangePassword: !seedPassword,
    },
  });

  // Create regular user
  const userPassword = seedPassword ?? randomPassword();
  const userPasswordHash = await bcrypt.hash(userPassword, 12);
  const user = await prisma.user.create({
    data: {
      email: "user@tessera.app",
      name: "Jane Cooper",
      passwordHash: userPasswordHash,
      isAdmin: false,
      mustChangePassword: !seedPassword,
    },
  });

  // Create team
  const team = await prisma.team.create({
    data: {
      name: "Engineering",
      description: "Core engineering team",
      ownerId: admin.id,
    },
  });

  // Create second team
  const team2 = await prisma.team.create({
    data: {
      name: "Product",
      description: "Product team",
      ownerId: user.id,
    },
  });

  // Memberships
  await prisma.teamMembership.create({ data: { userId: admin.id, teamId: team.id } });
  await prisma.teamMembership.create({ data: { userId: user.id, teamId: team.id } });
  await prisma.teamMembership.create({ data: { userId: user.id, teamId: team2.id } });

  // Groups
  const frontendGroup = await prisma.group.create({
    data: { name: "Frontend", teamId: team.id, description: "Frontend development group" },
  });
  const backendGroup = await prisma.group.create({
    data: { name: "Backend", teamId: team.id, description: "Backend development group" },
  });
  const designGroup = await prisma.group.create({
    data: { name: "Design", teamId: team2.id, description: "Design group" },
  });

  // Roles
  const adminRole = await prisma.role.create({
    data: {
      name: "Admin",
      teamId: team.id,
      description: "Full team admin",
      permissions: {
        create: [
          { permission: "notes:create" },
          { permission: "notes:edit_own" },
          { permission: "notes:edit_shared" },
          { permission: "notes:delete_own" },
          { permission: "notes:delete_shared" },
          { permission: "notes:view_private" },
          { permission: "notes:view_shared" },
          { permission: "notes:share_team" },
          { permission: "notes:share_users" },
          { permission: "notes:download" },
          { permission: "notes:upload_attachments" },
          { permission: "notes:delete_attachments" },
          { permission: "calendar:create" },
          { permission: "calendar:edit_own" },
          { permission: "calendar:edit_others" },
          { permission: "calendar:delete_own" },
          { permission: "calendar:delete_others" },
          { permission: "calendar:view_team" },
          { permission: "calendar:assign_users" },
          { permission: "calendar:assign_teams" },
          { permission: "tasks:create" },
          { permission: "tasks:edit_own" },
          { permission: "tasks:edit_others" },
          { permission: "tasks:delete_own" },
          { permission: "tasks:delete_others" },
          { permission: "tasks:move_columns" },
          { permission: "tasks:reassign_users" },
          { permission: "tasks:reassign_teams" },
          { permission: "tasks:move_groups" },
          { permission: "tasks:view_team" },
          { permission: "tasks:view_group" },
          { permission: "audit:view_team" },
        ],
      },
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      name: "Member",
      teamId: team.id,
      description: "Regular team member",
      permissions: {
        create: [
          { permission: "notes:create" },
          { permission: "notes:edit_own" },
          { permission: "notes:delete_own" },
          { permission: "notes:view_shared" },
          { permission: "notes:download" },
          { permission: "calendar:create" },
          { permission: "calendar:edit_own" },
          { permission: "calendar:delete_own" },
          { permission: "calendar:view_team" },
          { permission: "tasks:create" },
          { permission: "tasks:edit_own" },
          { permission: "tasks:delete_own" },
          { permission: "tasks:move_columns" },
          { permission: "tasks:view_team" },
          { permission: "tasks:view_group" },
        ],
      },
    },
  });

  const platformAdminRole = await prisma.role.create({
    data: {
      name: "Platform Admin",
      isPlatform: true,
      description: "Platform-wide admin",
      permissions: {
        create: [
          { permission: "users:create" },
          { permission: "users:edit" },
          { permission: "users:delete" },
          { permission: "teams:create" },
          { permission: "teams:edit" },
          { permission: "teams:delete" },
          { permission: "groups:create" },
          { permission: "groups:edit" },
          { permission: "groups:delete" },
          { permission: "roles:create" },
          { permission: "roles:edit" },
          { permission: "roles:delete" },
          { permission: "admin:grant" },
          { permission: "audit:view_all" },
        ],
      },
    },
  });

  // Assign roles
  await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: platformAdminRole.id } });
  await prisma.userRole.create({ data: { userId: user.id, roleId: memberRole.id } });

  // Notes
  const note1 = await prisma.note.create({
    data: {
      title: "Engineering Sprint Notes",
      content: `# Engineering Sprint 12\n\n## Goals\n- Complete auth system\n- Build taskboard drag and drop\n- Polish UI with orange accents\n\n## Checklist\n- [x] Set up project\n- [x] Database schema\n- [ ] API routes\n- [ ] Frontend pages\n\n> Important: Use real markdown, not fake rich text.\n\n\`\`\`typescript\nconst hello = \\"world\\";\nconsole.log(hello);\n\`\`\`
`,
      ownerId: admin.id,
      teamId: team.id,
      isPrivate: false,
    },
  });

  const note2 = await prisma.note.create({
    data: {
      title: "Product Roadmap Q3",
      content: `## Q3 Roadmap\n\n| Feature | Priority | Status |\n|---------|----------|--------|\n| Notes | High | In Progress |\n| Calendar | High | In Progress |\n| Tasks | High | In Progress |\n| Audit | Medium | Planned |\n\n### Links\n- [Internal Link](#)\n- [Back to dashboard](/dashboard)\n`,
      ownerId: user.id,
      teamId: team2.id,
      isPrivate: true,
    },
  });

  // Note share
  await prisma.noteShare.create({
    data: { noteId: note1.id, teamId: team.id },
  });

  // Calendar entries
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.calendarEntry.create({
    data: {
      title: "Sprint Planning",
      description: "Q3 sprint planning session",
      startDate: today,
      endDate: new Date(today.getTime() + 2 * 60 * 60 * 1000),
      isAllDay: false,
      userId: admin.id,
      teamId: team.id,
    },
  });

  await prisma.calendarEntry.create({
    data: {
      title: "Design Review",
      description: "Review new component designs",
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 60 * 60 * 1000),
      isAllDay: false,
      userId: user.id,
      teamId: team2.id,
    },
  });

  await prisma.calendarEntry.create({
    data: {
      title: "Team Offsite",
      description: "Quarterly team building event",
      startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      isAllDay: true,
      userId: admin.id,
      teamId: team.id,
      groupId: frontendGroup.id,
    },
  });

  // Task board and columns
  const board = await prisma.taskBoard.create({
    data: {
      name: "Sprint Board",
      teamId: team.id,
    },
  });

  const todoCol = await prisma.taskColumn.create({
    data: { name: "To Do", boardId: board.id, position: 0 },
  });
  const doingCol = await prisma.taskColumn.create({
    data: { name: "In Progress", boardId: board.id, position: 1 },
  });
  const reviewCol = await prisma.taskColumn.create({
    data: { name: "Review", boardId: board.id, position: 2 },
  });
  const doneCol = await prisma.taskColumn.create({
    data: { name: "Done", boardId: board.id, position: 3 },
  });

  // Tasks
  await prisma.task.create({
    data: {
      title: "Build auth system",
      description: "Implement secure session-based auth with iron-session",
      status: "todo",
      priority: "high",
      teamId: team.id,
      groupId: backendGroup.id,
      boardId: board.id,
      columnId: doingCol.id,
      position: 0,
      createdById: admin.id,
      assigneeId: admin.id,
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: "Design taskboard UI",
      description: "Create Kanban board with drag and drop using dnd-kit",
      status: "todo",
      priority: "high",
      teamId: team.id,
      groupId: frontendGroup.id,
      boardId: board.id,
      columnId: todoCol.id,
      position: 0,
      createdById: admin.id,
      assigneeId: user.id,
      dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: "Set up markdown editor",
      description: "Integrate a quality markdown editor with preview mode",
      status: "todo",
      priority: "medium",
      teamId: team.id,
      groupId: frontendGroup.id,
      boardId: board.id,
      columnId: todoCol.id,
      position: 1,
      createdById: user.id,
      assigneeId: admin.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Create audit log system",
      description: "Build comprehensive audit logging for all actions",
      status: "todo",
      priority: "medium",
      teamId: team.id,
      boardId: board.id,
      columnId: doneCol.id,
      position: 0,
      createdById: admin.id,
    },
  });

  // Audit logs
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "create",
      entityType: "team",
      entityId: team.id,
      teamId: team.id,
      metadata: { name: "Engineering" },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "create",
      entityType: "role",
      entityId: adminRole.id,
      teamId: team.id,
      metadata: { name: "Admin" },
    },
  });

  // Notifications
  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "alert",
      title: "Overdue Task",
      message: "Build auth system is due in 2 days",
      relatedEntityType: "task",
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "info",
      title: "New Note Shared",
      message: "Engineering Sprint Notes was shared with your team",
      relatedEntityType: "note",
    },
  });

  console.log("Seed completed successfully!");
  console.log("");
  if (seedPassword) {
    console.log("  TESSERA_SEED_PASSWORD was set — seeded users have a");
    console.log("  deterministic password and mustChangePassword is OFF.");
    console.log(`    admin: admin@tessera.app / ${adminPassword}`);
    console.log(`    user:  user@tessera.app  / ${userPassword}`);
  } else {
    console.log("  Login credentials (CHANGE THESE IMMEDIATELY):");
    console.log(`    admin: admin@tessera.app / ${adminPassword}`);
    console.log(`    user:  user@tessera.app  / ${userPassword}`);
    console.log("");
    console.log("  Both accounts are flagged mustChangePassword — they");
    console.log("  will be required to set a new password on first login.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
