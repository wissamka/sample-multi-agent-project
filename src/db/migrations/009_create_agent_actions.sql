CREATE TABLE IF NOT EXISTS agent_actions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL
                     CHECK (type IN ('invite_proposal', 'question', 'memory_added', 'email_filed', 'rule_applied')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied', 'info')),
  summary          TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}',
  related_email_id UUID REFERENCES inbound_emails(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_pending
  ON agent_actions(user_id) WHERE status = 'pending';
