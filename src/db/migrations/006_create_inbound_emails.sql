CREATE TABLE IF NOT EXISTS inbound_emails (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_name             TEXT,
  from_email            TEXT NOT NULL,
  to_address            TEXT NOT NULL,
  subject               TEXT NOT NULL,
  body                  TEXT NOT NULL,
  kind                  TEXT
                          CHECK (kind IN ('plain', 'calendar_invite', 'newsletter')),
  invite_payload        JSONB,
  classification        TEXT
                          CHECK (classification IN ('personal', 'work', 'newsletter', 'question', 'other')),
  classification_source TEXT
                          CHECK (classification_source IN ('heuristic', 'llm')),
  summary               TEXT,
  status                TEXT NOT NULL DEFAULT 'received'
                          CHECK (status IN ('received', 'processed', 'error')),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_user_id ON inbound_emails(user_id);
