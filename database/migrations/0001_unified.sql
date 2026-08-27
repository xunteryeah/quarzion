PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','disabled')),
  email_verified_at TEXT,
  last_login_at TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users (email);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL COLLATE NOCASE,
  plan TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  owner_display TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_uidx ON organizations (slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('organization_admin','member','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_uidx ON organization_members (organization_id, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members (user_id, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL CHECK (role IN ('organization_admin','member','viewer')),
  token_hash TEXT NOT NULL,
  invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_uidx ON invitations (token_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS invitations_org_email_idx ON invitations (organization_id, email, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_uidx ON sessions (token_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_user_expiry_idx ON sessions (user_id, expires_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS auth_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  email_hash TEXT NOT NULL,
  ip_hash TEXT,
  succeeded INTEGER NOT NULL DEFAULT 0 CHECK (succeeded IN (0,1)),
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_attempts_email_time_idx ON auth_attempts (email_hash, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_attempts_ip_time_idx ON auth_attempts (ip_hash, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'CN',
  language TEXT NOT NULL DEFAULT 'zh-CN',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS projects_org_status_idx ON projects (organization_id, status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  website TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brands_org_project_idx ON brands (organization_id, project_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS brands_project_canonical_uidx ON brands (project_id, canonical_name);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS brand_aliases (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  detected_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'parser',
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id, organization_id, project_id) REFERENCES brands(id, organization_id, project_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aliases_org_project_idx ON brand_aliases (organization_id, project_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS aliases_brand_alias_uidx ON brand_aliases (brand_id, alias);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS topics_org_project_idx ON topics (organization_id, project_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'custom',
  is_branded INTEGER NOT NULL DEFAULT 0 CHECK (is_branded IN (0,1)),
  target_platforms TEXT NOT NULL DEFAULT '["doubao","yuanbao","deepseek"]',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id, organization_id, project_id) REFERENCES topics(id, organization_id, project_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS prompts_org_project_idx ON prompts (organization_id, project_id, active);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('doubao','yuanbao','deepseek')),
  region TEXT NOT NULL DEFAULT 'CN',
  model_version TEXT,
  collector_version TEXT NOT NULL DEFAULT 'collector-interface/1.0',
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER,
  raw_text TEXT,
  error_message TEXT,
  parsed_at TEXT,
  unique_run_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id, organization_id, project_id) REFERENCES prompts(id, organization_id, project_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS runs_org_project_status_idx ON runs (organization_id, project_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS runs_prompt_idx ON runs (prompt_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS runs_unique_key_uidx ON runs (unique_run_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  mentions_primary INTEGER NOT NULL DEFAULT 0 CHECK (mentions_primary IN (0,1)),
  primary_position INTEGER,
  sentiment_score REAL,
  parser_version TEXT NOT NULL DEFAULT 'entity-parser/1.0',
  created_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, organization_id, project_id) REFERENCES runs(id, organization_id, project_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS answers_run_uidx ON answers (run_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS answers_org_project_idx ON answers (organization_id, project_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS answer_brand_mentions (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  answer_id TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 1,
  sentiment_score REAL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (answer_id, organization_id, project_id) REFERENCES answers(id, organization_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id, organization_id, project_id) REFERENCES brands(id, organization_id, project_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS mentions_org_project_answer_idx ON answer_brand_mentions (organization_id, project_id, answer_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS citations (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  answer_id TEXT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  mentions_primary INTEGER NOT NULL DEFAULT 0 CHECK (mentions_primary IN (0,1)),
  first_seen_at TEXT NOT NULL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (answer_id, organization_id, project_id) REFERENCES answers(id, organization_id, project_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS citations_org_project_domain_idx ON citations (organization_id, project_id, domain);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS citations_answer_idx ON citations (answer_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS optimization_actions (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'medium',
  owner TEXT NOT NULL DEFAULT 'unassigned',
  target_platforms TEXT NOT NULL DEFAULT '[]',
  target_prompt_ids TEXT NOT NULL DEFAULT '[]',
  published_url TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (id, organization_id, project_id),
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS actions_org_project_idx ON optimization_actions (organization_id, project_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS evidence_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL REFERENCES optimization_actions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('baseline','post')),
  platform TEXT NOT NULL CHECK (platform IN ('doubao','yuanbao','deepseek')),
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
CREATE INDEX IF NOT EXISTS evidence_org_project_action_idx ON evidence_snapshots (organization_id, project_id, action_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  message TEXT NOT NULL,
  request_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_org_project_time_idx ON audit_events (organization_id, project_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS account_pools (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('doubao','yuanbao','deepseek')),
  mode TEXT NOT NULL DEFAULT 'web',
  status TEXT NOT NULL DEFAULT 'active',
  daily_budget INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collector_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  pool_id TEXT NOT NULL REFERENCES account_pools(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('doubao','yuanbao','deepseek')),
  label TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  credential_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  daily_budget INTEGER NOT NULL DEFAULT 30,
  today_used INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 100,
  last_success_at TEXT,
  cooldown_until TEXT,
  error_streak INTEGER NOT NULL DEFAULT 0,
  owner TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS accounts_pool_status_idx ON collector_accounts (pool_id, status);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS accounts_label_uidx ON collector_accounts (label);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collector_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt_id TEXT REFERENCES prompts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('doubao','yuanbao','deepseek')),
  prompt_text TEXT NOT NULL,
  account_id TEXT REFERENCES collector_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'normal',
  attempt INTEGER NOT NULL DEFAULT 1,
  scheduled_at TEXT NOT NULL,
  completed_at TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id, organization_id, project_id) REFERENCES prompts(id, organization_id, project_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_org_project_idx ON collector_tasks (organization_id, project_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_status_platform_idx ON collector_tasks (status, platform);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS collector_events (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT REFERENCES collector_accounts(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES collector_tasks(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0 CHECK (acknowledged IN (0,1)),
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS events_severity_time_idx ON collector_events (severity, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  message TEXT NOT NULL,
  request_id TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_audit_time_idx ON admin_audit_events (created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'received',
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_error TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_status_time_idx ON contact_submissions (delivery_status, created_at);
--> statement-breakpoint
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES ('0001_unified', CURRENT_TIMESTAMP);
