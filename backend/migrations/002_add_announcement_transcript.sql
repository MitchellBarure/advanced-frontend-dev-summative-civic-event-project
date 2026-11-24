-- FIX (frontend project): optional written transcript for audio announcements (accessibility).
-- Safe to run more than once.
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS transcript TEXT;
