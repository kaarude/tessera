-- Add theme preference to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'dark';
