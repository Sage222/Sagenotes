-- Migration: add deletedAt to Note for soft delete
ALTER TABLE "Note" ADD COLUMN "deletedAt" DATETIME;
