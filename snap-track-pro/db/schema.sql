-- Snap & Track schema. Postgres 14+.
-- Idempotent: safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('parent', 'kid')),
  -- Parents log in with email; kids log in with username.
  email         CITEXT UNIQUE,
  username      CITEXT UNIQUE,
  password_hash TEXT NOT NULL,
  parent_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  age           INTEGER,
  gender        TEXT CHECK (gender IN ('male', 'female') OR gender IS NULL),
  height_cm     NUMERIC,
  weight_kg     NUMERIC,
  color         TEXT NOT NULL DEFAULT '#7c3aed',
  calorie_goal  INTEGER NOT NULL DEFAULT 1500,
  water_goal_ml INTEGER NOT NULL DEFAULT 1400,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_or_username CHECK (
    (role = 'parent' AND email IS NOT NULL AND username IS NULL)
    OR
    (role = 'kid' AND username IS NOT NULL AND email IS NULL AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS users_parent_id_idx ON users(parent_id);

CREATE TABLE IF NOT EXISTS entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('food', 'water')),
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- food
  food_name   TEXT,
  calories    INTEGER,
  notes       TEXT,
  confidence  TEXT CHECK (confidence IN ('low', 'medium', 'high') OR confidence IS NULL),
  -- water
  ml          INTEGER,
  CONSTRAINT entry_shape CHECK (
    (type = 'food'  AND food_name IS NOT NULL AND ml IS NULL) OR
    (type = 'water' AND ml IS NOT NULL AND food_name IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS entries_user_ts_idx ON entries(user_id, ts DESC);

-- Per-user, per-UTC-day analyze counter (cheap rate limiting).
CREATE TABLE IF NOT EXISTS analyze_usage (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      DATE NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
