CREATE TABLE IF NOT EXISTS briefs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brief_date   DATE NOT NULL,
  trigger      TEXT NOT NULL
                 CHECK (trigger IN ('manual', 'scheduled')),
  content      JSONB NOT NULL,
  prose        TEXT NOT NULL,
  generated_by TEXT NOT NULL
                 CHECK (generated_by IN ('heuristic', 'llm')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefs_user_date ON briefs(user_id, brief_date);
