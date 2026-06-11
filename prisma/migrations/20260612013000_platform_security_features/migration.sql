ALTER TABLE "CalendarEntry"
  ADD COLUMN "recurrenceRule" TEXT,
  ADD COLUMN "recurrenceEnd" TIMESTAMP(3),
  ADD COLUMN "recurrenceParentId" TEXT;

ALTER TABLE "Task"
  ADD COLUMN "recurrenceRule" TEXT,
  ADD COLUMN "recurrenceEnd" TIMESTAMP(3),
  ADD COLUMN "recurrenceParentId" TEXT;

ALTER TABLE "TaskBoard" ADD COLUMN "templateId" TEXT;
ALTER TABLE "User"
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecretEncrypted" TEXT,
  ADD COLUMN "recoveryCodeHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

CREATE TABLE "ApiToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scopes" TEXT[],
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");
CREATE INDEX "ApiToken_prefix_idx" ON "ApiToken"("prefix");

CREATE TABLE "Webhook" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "teamId" TEXT,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "secretEncrypted" TEXT NOT NULL,
  "events" TEXT[],
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Webhook_userId_idx" ON "Webhook"("userId");
CREATE INDEX "Webhook_teamId_idx" ON "Webhook"("teamId");

CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "statusCode" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX "WebhookDelivery_attemptedAt_idx" ON "WebhookDelivery"("attemptedAt");

CREATE TABLE "TaskBoardTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "teamId" TEXT,
  "createdById" TEXT NOT NULL,
  "columns" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskBoardTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskBoardTemplate_teamId_idx" ON "TaskBoardTemplate"("teamId");

CREATE TABLE "SystemBackup" (
  "id" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "s3Key" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "restoredAt" TIMESTAMP(3),
  CONSTRAINT "SystemBackup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SystemBackup_createdAt_idx" ON "SystemBackup"("createdAt");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskBoardTemplate" ADD CONSTRAINT "TaskBoardTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskBoardTemplate" ADD CONSTRAINT "TaskBoardTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemBackup" ADD CONSTRAINT "SystemBackup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskBoard" ADD CONSTRAINT "TaskBoard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskBoardTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "CalendarEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
