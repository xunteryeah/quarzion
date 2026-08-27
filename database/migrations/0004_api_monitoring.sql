-- quarzion:foreign-keys-off
CREATE TABLE prompts_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'custom',
  is_branded INTEGER NOT NULL DEFAULT 0 CHECK (is_branded IN (0,1)),
  target_platforms TEXT NOT NULL DEFAULT '["doubao","qwen","deepseek"]',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, organization_id, project_id) REFERENCES topics(id, organization_id, project_id)
);
--> statement-breakpoint
INSERT INTO prompts_v2 SELECT id, organization_id, project_id, topic_id, query_text, intent, is_branded, replace(target_platforms, 'yuanbao', 'qwen'), active, created_at, updated_at FROM prompts;
--> statement-breakpoint
DROP TABLE prompts;
--> statement-breakpoint
ALTER TABLE prompts_v2 RENAME TO prompts;
--> statement-breakpoint
CREATE INDEX prompts_org_project_idx ON prompts (organization_id, project_id, active);
--> statement-breakpoint
CREATE TABLE runs_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('doubao','qwen','deepseek')),
  region TEXT NOT NULL DEFAULT 'CN',
  model_version TEXT,
  model_tier TEXT CHECK (model_tier IS NULL OR model_tier IN ('flagship','secondary','analysis')),
  response_mode TEXT NOT NULL DEFAULT 'direct' CHECK (response_mode IN ('direct','web_search')),
  collector_version TEXT NOT NULL DEFAULT 'quarzion-api-worker/2.0.0',
  execution_mode TEXT NOT NULL DEFAULT 'official_api',
  source_url TEXT,
  page_title TEXT,
  provider_request_id TEXT,
  provider_created_at TEXT,
  request_sha256 TEXT,
  provider_response_sha256 TEXT,
  response_sha256 TEXT,
  raw_response_json TEXT,
  search_performed INTEGER NOT NULL DEFAULT 0 CHECK (search_performed IN (0,1)),
  search_metadata_json TEXT NOT NULL DEFAULT '{}',
  capability_snapshot_json TEXT NOT NULL DEFAULT '{}',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  cost_micros INTEGER,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER,
  raw_text TEXT,
  error_message TEXT,
  parsed_at TEXT,
  unique_run_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  claimed_at TEXT,
  lease_expires_at TEXT,
  lease_token_hash TEXT,
  worker_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  last_heartbeat_at TEXT,
  next_attempt_at TEXT,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  failure_code TEXT,
  failure_category TEXT,
  result_key TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id, organization_id, project_id) REFERENCES prompts(id, organization_id, project_id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO runs_v2 (
  id, organization_id, project_id, prompt_id, platform, region, model_version, collector_version,
  execution_mode, source_url, page_title, response_sha256, scheduled_at, status, attempt, duration_ms,
  raw_text, error_message, parsed_at, unique_run_key, priority, claimed_at, lease_expires_at,
  lease_token_hash, worker_id, started_at, completed_at, last_heartbeat_at, next_attempt_at,
  max_attempts, failure_code, failure_category, result_key, created_at
) SELECT
  id, organization_id, project_id, prompt_id,
  CASE WHEN platform = 'yuanbao' THEN 'qwen' ELSE platform END,
  region, model_version, collector_version,
  CASE WHEN execution_mode = 'anonymous' THEN 'legacy_browser' ELSE execution_mode END,
  source_url, page_title, response_sha256, scheduled_at, status, attempt, duration_ms,
  raw_text, error_message, parsed_at, replace(unique_run_key, ':yuanbao:', ':qwen:'), priority,
  claimed_at, lease_expires_at, lease_token_hash, worker_id, started_at, completed_at,
  last_heartbeat_at, next_attempt_at, max_attempts, failure_code, failure_category, result_key, created_at
FROM runs;
--> statement-breakpoint
DROP TABLE runs;
--> statement-breakpoint
ALTER TABLE runs_v2 RENAME TO runs;
--> statement-breakpoint
CREATE INDEX runs_org_project_status_idx ON runs (organization_id, project_id, status);
--> statement-breakpoint
CREATE INDEX runs_prompt_idx ON runs (prompt_id);
--> statement-breakpoint
CREATE UNIQUE INDEX runs_unique_key_uidx ON runs (unique_run_key);
--> statement-breakpoint
CREATE INDEX runs_claim_queue_idx ON runs (status, next_attempt_at, scheduled_at, priority);
--> statement-breakpoint
CREATE INDEX runs_lease_idx ON runs (status, lease_expires_at);
--> statement-breakpoint
CREATE INDEX runs_worker_idx ON runs (worker_id, status);
--> statement-breakpoint
CREATE UNIQUE INDEX runs_result_key_uidx ON runs (result_key) WHERE result_key IS NOT NULL;
--> statement-breakpoint
ALTER TABLE citations ADD COLUMN citation_index INTEGER;
--> statement-breakpoint
ALTER TABLE citations ADD COLUMN snippet TEXT;
--> statement-breakpoint
ALTER TABLE citations ADD COLUMN provider_source_id TEXT;
--> statement-breakpoint
ALTER TABLE citations ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
--> statement-breakpoint
CREATE TABLE evidence_snapshots_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL REFERENCES optimization_actions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('baseline','post')),
  platform TEXT NOT NULL CHECK (platform IN ('doubao','qwen','deepseek')),
  prompt_id TEXT REFERENCES prompts(id) ON DELETE SET NULL,
  answers_count INTEGER NOT NULL,
  mention_rate REAL NOT NULL,
  avg_position REAL,
  citation_count INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (action_id, organization_id, project_id) REFERENCES optimization_actions(id, organization_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id, organization_id, project_id) REFERENCES prompts(id, organization_id, project_id)
);
--> statement-breakpoint
INSERT INTO evidence_snapshots_v2 SELECT id, organization_id, project_id, action_id, phase, CASE WHEN platform = 'yuanbao' THEN 'qwen' ELSE platform END, prompt_id, answers_count, mention_rate, avg_position, citation_count, recorded_at FROM evidence_snapshots;
--> statement-breakpoint
DROP TABLE evidence_snapshots;
--> statement-breakpoint
ALTER TABLE evidence_snapshots_v2 RENAME TO evidence_snapshots;
--> statement-breakpoint
CREATE INDEX evidence_org_project_action_idx ON evidence_snapshots (organization_id, project_id, action_id);
--> statement-breakpoint
CREATE TABLE collection_policies_v2 (
  platform TEXT PRIMARY KEY NOT NULL CHECK (platform IN ('doubao','qwen','deepseek')),
  display_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  paused_reason TEXT,
  max_concurrency INTEGER NOT NULL DEFAULT 2,
  timeout_seconds INTEGER NOT NULL DEFAULT 180,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  base_retry_seconds INTEGER NOT NULL DEFAULT 60,
  daily_budget INTEGER NOT NULL DEFAULT 5000,
  execution_mode TEXT NOT NULL DEFAULT 'official_api',
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO collection_policies_v2 (platform, display_name, enabled, paused_reason, max_concurrency, timeout_seconds, max_attempts, base_retry_seconds, daily_budget, execution_mode, updated_at)
SELECT CASE WHEN platform = 'yuanbao' THEN 'qwen' ELSE platform END,
  CASE WHEN platform = 'yuanbao' THEN '千问' ELSE display_name END,
  enabled, paused_reason, 2, 180, max_attempts, base_retry_seconds, 5000, 'official_api', updated_at
FROM collection_policies;
--> statement-breakpoint
DROP TABLE collection_policies;
--> statement-breakpoint
ALTER TABLE collection_policies_v2 RENAME TO collection_policies;
--> statement-breakpoint
CREATE TABLE provider_models (
  provider TEXT NOT NULL CHECK (provider IN ('doubao','qwen','deepseek')),
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('flagship','secondary','analysis')),
  supports_direct INTEGER NOT NULL DEFAULT 1 CHECK (supports_direct IN (0,1)),
  supports_web_search INTEGER NOT NULL DEFAULT 0 CHECK (supports_web_search IN (0,1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  analyzer_eligible INTEGER NOT NULL DEFAULT 0 CHECK (analyzer_eligible IN (0,1)),
  capability_version TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, model_id)
);
--> statement-breakpoint
INSERT INTO provider_models (provider, model_id, display_name, tier, supports_direct, supports_web_search, enabled, analyzer_eligible, capability_version, metadata_json, updated_at) VALUES
  ('doubao', 'doubao-seed-2-1-pro-260628', 'Doubao Seed 2.1 Pro', 'flagship', 1, 1, 1, 0, '2026-08-27', '{}', CURRENT_TIMESTAMP),
  ('doubao', 'doubao-seed-2-1-turbo-260628', 'Doubao Seed 2.1 Turbo', 'secondary', 1, 1, 1, 0, '2026-08-27', '{}', CURRENT_TIMESTAMP),
  ('qwen', 'qwen3.8-max', 'Qwen 3.8 Max', 'flagship', 1, 1, 1, 0, '2026-08-27', '{}', CURRENT_TIMESTAMP),
  ('qwen', 'qwen3.7-plus', 'Qwen 3.7 Plus', 'secondary', 1, 1, 1, 0, '2026-08-27', '{}', CURRENT_TIMESTAMP),
  ('deepseek', 'deepseek-v4-pro', 'DeepSeek V4 Pro', 'flagship', 1, 0, 1, 0, '2026-08-27', '{"webSearch":"unsupported"}', CURRENT_TIMESTAMP),
  ('deepseek', 'deepseek-v4-flash', 'DeepSeek V4 Flash', 'secondary', 1, 1, 1, 1, '2026-08-27', '{}', CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE TABLE monitoring_schedules (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly','paused')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  local_run_time TEXT NOT NULL DEFAULT '02:00',
  prompt_limit INTEGER NOT NULL DEFAULT 10,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  last_generated_for_date TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE collector_workers ADD COLUMN capabilities_json TEXT NOT NULL DEFAULT '[]';
--> statement-breakpoint
UPDATE collector_workers SET supported_platforms = replace(supported_platforms, 'yuanbao', 'qwen'), execution_mode = CASE WHEN execution_mode = 'anonymous' THEN 'legacy_browser' ELSE execution_mode END;
--> statement-breakpoint
UPDATE optimization_actions SET target_platforms = replace(target_platforms, 'yuanbao', 'qwen');
--> statement-breakpoint
UPDATE system_alerts SET platform = 'qwen' WHERE platform = 'yuanbao';
--> statement-breakpoint
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('0004_api_monitoring', CURRENT_TIMESTAMP);
