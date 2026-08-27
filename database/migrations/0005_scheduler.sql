CREATE INDEX IF NOT EXISTS monitoring_schedules_due_idx
  ON monitoring_schedules (enabled, next_run_at);
--> statement-breakpoint
INSERT OR IGNORE INTO monitoring_schedules (
  id, organization_id, project_id, frequency, timezone, local_run_time,
  prompt_limit, enabled, last_generated_for_date, next_run_at, created_at, updated_at
)
SELECT
  'schedule-' || lower(hex(randomblob(16))), p.organization_id, p.id,
  'daily', 'Asia/Shanghai', '02:00', 10, 1, NULL, CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM projects p
WHERE p.status = 'active';
--> statement-breakpoint
UPDATE provider_models
SET metadata_json = '{"directProtocol":"chat_completions","webSearch":"unsupported","responsesApi":"flash_only"}',
    updated_at = CURRENT_TIMESTAMP
WHERE provider = 'deepseek' AND model_id = 'deepseek-v4-pro';
--> statement-breakpoint
INSERT OR IGNORE INTO schema_migrations (version, applied_at)
VALUES ('0005_scheduler', CURRENT_TIMESTAMP);
