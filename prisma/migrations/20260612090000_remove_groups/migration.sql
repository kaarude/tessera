ALTER TABLE "Note" DROP CONSTRAINT IF EXISTS "Note_groupId_fkey";
ALTER TABLE "CalendarEntry" DROP CONSTRAINT IF EXISTS "CalendarEntry_groupId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_groupId_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_groupId_fkey";

DROP INDEX IF EXISTS "AuditLog_groupId_idx";

ALTER TABLE "Note" DROP COLUMN "groupId";
ALTER TABLE "CalendarEntry" DROP COLUMN "groupId";
ALTER TABLE "Task" DROP COLUMN "groupId";
ALTER TABLE "AuditLog" DROP COLUMN "groupId";

DROP TABLE "Group";
