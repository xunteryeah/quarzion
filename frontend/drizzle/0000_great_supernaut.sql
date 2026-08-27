CREATE TABLE `answer_brand_mentions` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`brand_id` text NOT NULL,
	`position` integer NOT NULL,
	`mention_count` integer DEFAULT 1 NOT NULL,
	`sentiment_score` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mentions_answer_idx` ON `answer_brand_mentions` (`answer_id`);--> statement-breakpoint
CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`project_id` text NOT NULL,
	`answer_text` text NOT NULL,
	`mentions_primary` integer NOT NULL,
	`primary_position` integer,
	`sentiment_score` real,
	`parser_version` text DEFAULT 'entity-parser/1.0' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answers_run_uidx` ON `answers` (`run_id`);--> statement-breakpoint
CREATE INDEX `answers_project_idx` ON `answers` (`project_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`event_type` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_project_idx` ON `audit_events` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `brand_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`brand_id` text NOT NULL,
	`alias` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`detected_count` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'parser' NOT NULL,
	`reviewed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `aliases_project_idx` ON `brand_aliases` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `aliases_brand_alias_uidx` ON `brand_aliases` (`brand_id`,`alias`);--> statement-breakpoint
CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`canonical_name` text NOT NULL,
	`website` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `brands_project_idx` ON `brands` (`project_id`);--> statement-breakpoint
CREATE TABLE `citations` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`domain` text NOT NULL,
	`title` text NOT NULL,
	`source_type` text NOT NULL,
	`mentions_primary` integer DEFAULT false NOT NULL,
	`first_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `citations_project_domain_idx` ON `citations` (`project_id`,`domain`);--> statement-breakpoint
CREATE INDEX `citations_answer_idx` ON `citations` (`answer_id`);--> statement-breakpoint
CREATE TABLE `evidence_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`action_id` text NOT NULL,
	`phase` text NOT NULL,
	`platform` text NOT NULL,
	`prompt_id` text,
	`answers_count` integer NOT NULL,
	`mention_rate` real NOT NULL,
	`avg_position` real,
	`citation_count` integer NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `evidence_action_idx` ON `evidence_snapshots` (`action_id`);--> statement-breakpoint
CREATE TABLE `optimization_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`owner` text NOT NULL,
	`target_platforms` text NOT NULL,
	`target_prompt_ids` text NOT NULL,
	`published_url` text,
	`completed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `actions_project_idx` ON `optimization_actions` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client_name` text NOT NULL,
	`region` text DEFAULT 'CN' NOT NULL,
	`language` text DEFAULT 'zh-CN' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`query_text` text NOT NULL,
	`intent` text NOT NULL,
	`is_branded` integer DEFAULT false NOT NULL,
	`target_platforms` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prompts_project_idx` ON `prompts` (`project_id`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`platform` text NOT NULL,
	`scheduled_at` text NOT NULL,
	`status` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`duration_ms` integer,
	`collector_version` text DEFAULT 'demo-collector/1.0' NOT NULL,
	`raw_text` text,
	`error_message` text,
	`parsed_at` text,
	`unique_run_key` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_project_status_idx` ON `runs` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `runs_prompt_idx` ON `runs` (`prompt_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `runs_unique_key_uidx` ON `runs` (`unique_run_key`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL
);
