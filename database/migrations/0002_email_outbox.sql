PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('contact','invitation')),
  reference_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL COLLATE NOCASE,
  payload_ciphertext TEXT NOT NULL,
  payload_iv TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivering','retry','delivered','failed','cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (kind, reference_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS email_outbox_due_idx ON email_outbox (status, next_attempt_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS email_outbox_reference_idx ON email_outbox (kind, reference_id);
--> statement-breakpoint
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('0002_email_outbox', CURRENT_TIMESTAMP);
