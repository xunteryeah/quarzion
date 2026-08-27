ALTER TABLE runs ADD COLUMN priority INTEGER NOT NULL DEFAULT 50;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'anonymous';
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN source_url TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN page_title TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN response_sha256 TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN claimed_at TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN lease_expires_at TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN lease_token_hash TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN worker_id TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN started_at TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN completed_at TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN last_heartbeat_at TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN next_attempt_at TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN failure_code TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN failure_category TEXT;
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN result_key TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS runs_claim_queue_idx ON runs (status, next_attempt_at, scheduled_at, priority);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS runs_lease_idx ON runs (status, lease_expires_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS runs_worker_idx ON runs (worker_id, status);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS runs_result_key_uidx ON runs (result_key) WHERE result_key IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collector_workers (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online','draining','offline','disabled')),
  collector_version TEXT NOT NULL,
  supported_platforms TEXT NOT NULL DEFAULT '["doubao","yuanbao","deepseek"]',
  execution_mode TEXT NOT NULL DEFAULT 'anonymous',
  current_run_id TEXT REFERENCES runs(id) ON DELETE SET NULL,
  last_seen_at TEXT NOT NULL,
  last_ip_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS collector_workers_status_seen_idx ON collector_workers (status, last_seen_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS run_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  worker_id TEXT REFERENCES collector_workers(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,
  failure_code TEXT,
  failure_category TEXT,
  error_message TEXT,
  page_fingerprint TEXT,
  model_version TEXT,
  collector_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, attempt_number),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS run_attempts_run_idx ON run_attempts (run_id, attempt_number);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS run_attempts_failure_idx ON run_attempts (failure_category, completed_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  answer_id TEXT REFERENCES answers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('screenshot','html','trace')),
  mime_type TEXT NOT NULL,
  content BLOB NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  source_url TEXT,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, kind, sha256),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS evidence_artifacts_org_project_idx ON evidence_artifacts (organization_id, project_id, captured_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS evidence_artifacts_run_idx ON evidence_artifacts (run_id, kind);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collection_policies (
  platform TEXT PRIMARY KEY NOT NULL CHECK (platform IN ('doubao','yuanbao','deepseek')),
  display_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  paused_reason TEXT,
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  timeout_seconds INTEGER NOT NULL DEFAULT 120,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  base_retry_seconds INTEGER NOT NULL DEFAULT 60,
  daily_budget INTEGER NOT NULL DEFAULT 100,
  execution_mode TEXT NOT NULL DEFAULT 'anonymous',
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO collection_policies (platform, display_name, enabled, max_concurrency, timeout_seconds, max_attempts, base_retry_seconds, daily_budget, execution_mode, updated_at) VALUES
  ('doubao', '豆包', 1, 1, 150, 3, 90, 80, 'anonymous', CURRENT_TIMESTAMP),
  ('yuanbao', '腾讯元宝', 1, 1, 150, 3, 90, 80, 'anonymous', CURRENT_TIMESTAMP),
  ('deepseek', 'DeepSeek', 1, 1, 150, 3, 90, 80, 'anonymous', CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
--> statement-breakpoint
INSERT OR IGNORE INTO system_settings (key, value_json, updated_at, updated_by) VALUES ('collector.emergency_stop', '{"enabled":false,"reason":null}', CURRENT_TIMESTAMP, 'migration');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS system_alerts (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  run_id TEXT REFERENCES runs(id) ON DELETE CASCADE,
  platform TEXT,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS system_alerts_open_fingerprint_uidx ON system_alerts (fingerprint) WHERE status != 'resolved';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS system_alerts_status_severity_idx ON system_alerts (status, severity, last_seen_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS system_alerts_org_project_idx ON system_alerts (organization_id, project_id, last_seen_at);
--> statement-breakpoint
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('0003_p1_collection', CURRENT_TIMESTAMP);
