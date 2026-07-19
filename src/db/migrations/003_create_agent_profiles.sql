CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  agent_address TEXT NOT NULL UNIQUE,
  brief_hour    SMALLINT NOT NULL DEFAULT 8
                  CHECK (brief_hour BETWEEN 0 AND 23),
  interests     TEXT[] NOT NULL DEFAULT '{}',
  onboarded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
