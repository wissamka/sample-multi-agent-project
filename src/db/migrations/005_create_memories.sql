CREATE TABLE IF NOT EXISTS memories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
                    CHECK (category IN ('fact', 'preference', 'contact', 'note')),
  content         TEXT NOT NULL,
  source          TEXT NOT NULL
                    CHECK (source IN ('onboarding', 'email', 'manual')),
  -- Provenance breadcrumb only; no FK because inbound_emails is created in 006.
  source_email_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
