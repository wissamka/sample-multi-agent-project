CREATE TABLE IF NOT EXISTS invite_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  trigger    TEXT NOT NULL
               CHECK (trigger IN ('personal_event', 'work_event', 'unknown_sender')),
  action     TEXT NOT NULL
               CHECK (action IN ('add_family', 'add_coworkers', 'ask_user', 'auto_accept', 'auto_decline')),
  mode       TEXT NOT NULL DEFAULT 'ask'
               CHECK (mode IN ('auto', 'ask')),
  enabled    BOOLEAN NOT NULL DEFAULT true,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, trigger, action)
);

CREATE INDEX IF NOT EXISTS idx_invite_rules_user_id ON invite_rules(user_id);
