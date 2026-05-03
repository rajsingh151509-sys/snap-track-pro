-- Migration: add protein tracking + athlete flag.
-- Safe to run multiple times — uses IF NOT EXISTS where possible.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS protein_goal INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_athlete   BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS protein_g INTEGER;
