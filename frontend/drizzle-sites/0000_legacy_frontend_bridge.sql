ALTER TABLE answer_brand_mentions RENAME TO legacy_frontend_answer_brand_mentions_20260820;
--> statement-breakpoint
ALTER TABLE answers RENAME TO legacy_frontend_answers_20260820;
--> statement-breakpoint
ALTER TABLE audit_events RENAME TO legacy_frontend_audit_events_20260820;
--> statement-breakpoint
ALTER TABLE brand_aliases RENAME TO legacy_frontend_brand_aliases_20260820;
--> statement-breakpoint
ALTER TABLE brands RENAME TO legacy_frontend_brands_20260820;
--> statement-breakpoint
ALTER TABLE citations RENAME TO legacy_frontend_citations_20260820;
--> statement-breakpoint
ALTER TABLE evidence_snapshots RENAME TO legacy_frontend_evidence_snapshots_20260820;
--> statement-breakpoint
ALTER TABLE optimization_actions RENAME TO legacy_frontend_optimization_actions_20260820;
--> statement-breakpoint
ALTER TABLE projects RENAME TO legacy_frontend_projects_20260820;
--> statement-breakpoint
ALTER TABLE prompts RENAME TO legacy_frontend_prompts_20260820;
--> statement-breakpoint
ALTER TABLE runs RENAME TO legacy_frontend_runs_20260820;
--> statement-breakpoint
ALTER TABLE topics RENAME TO legacy_frontend_topics_20260820;
--> statement-breakpoint
DROP INDEX IF EXISTS mentions_answer_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS answers_run_uidx;
--> statement-breakpoint
DROP INDEX IF EXISTS answers_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS audit_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS aliases_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS aliases_brand_alias_uidx;
--> statement-breakpoint
DROP INDEX IF EXISTS brands_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS citations_project_domain_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS citations_answer_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS evidence_action_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS actions_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS prompts_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS runs_project_status_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS runs_prompt_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS runs_unique_key_uidx;
