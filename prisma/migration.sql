-- Migration: Add Setting table and useSignature column to Template
-- Run this against your SQLite database if Prisma db push doesn't work

-- 1. Create settings table for signature storage
CREATE TABLE IF NOT EXISTS "Setting" (
    "key"       TEXT NOT NULL PRIMARY KEY,
    "value"     TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add useSignature column to Template table (default = true/1)
ALTER TABLE "Template" ADD COLUMN "useSignature" BOOLEAN NOT NULL DEFAULT 1;
