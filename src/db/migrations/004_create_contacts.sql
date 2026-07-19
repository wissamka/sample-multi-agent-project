CREATE TABLE IF NOT EXISTS contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  relationship TEXT NOT NULL
                 CHECK (relationship IN ('family', 'coworker', 'other')),
  source       TEXT NOT NULL DEFAULT 'onboarding'
                 CHECK (source IN ('onboarding', 'learned', 'manual')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
