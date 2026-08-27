CREATE TABLE `account_pools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`mode` text DEFAULT 'app' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`daily_budget` integer DEFAULT 100 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_time_idx` ON `admin_audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `client_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`primary_brand` text NOT NULL,
	`platforms` text NOT NULL,
	`prompt_count` integer DEFAULT 0 NOT NULL,
	`run_status` text DEFAULT 'active' NOT NULL,
	`last_run_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_org_idx` ON `client_projects` (`organization_id`);--> statement-breakpoint
CREATE TABLE `collector_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`platform` text NOT NULL,
	`label` text NOT NULL,
	`auth_type` text NOT NULL,
	`credential_ref` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`daily_budget` integer DEFAULT 30 NOT NULL,
	`today_used` integer DEFAULT 0 NOT NULL,
	`success_rate` real DEFAULT 100 NOT NULL,
	`last_success_at` text,
	`cooldown_until` text,
	`error_streak` integer DEFAULT 0 NOT NULL,
	`owner` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `accounts_pool_status_idx` ON `collector_accounts` (`pool_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_label_uidx` ON `collector_accounts` (`label`);--> statement-breakpoint
CREATE TABLE `collector_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text,
	`task_id` text,
	`event_type` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`acknowledged` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_severity_time_idx` ON `collector_events` (`severity`,`created_at`);--> statement-breakpoint
CREATE TABLE `collector_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`platform` text NOT NULL,
	`prompt_text` text NOT NULL,
	`account_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`scheduled_at` text NOT NULL,
	`completed_at` text,
	`error_code` text
);
--> statement-breakpoint
CREATE INDEX `tasks_status_platform_idx` ON `collector_tasks` (`status`,`platform`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `collector_tasks` (`project_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plan` text DEFAULT 'standard' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `organizations` (`id`,`name`,`plan`,`status`,`owner`,`created_at`) VALUES
('org-watch','Watch 集团','enterprise','active','胡老师','2026-07-21T09:00:00Z'),
('org-auto','新能源汽车研究院','standard','active','林琳','2026-07-24T09:00:00Z'),
('org-beauty','澄光美妆','starter','paused','周婉','2026-07-28T09:00:00Z');
--> statement-breakpoint
INSERT INTO `client_projects` (`id`,`organization_id`,`name`,`primary_brand`,`platforms`,`prompt_count`,`run_status`,`last_run_at`,`created_at`) VALUES
('proj-watch','org-watch','高端腕表 GEO','百达翡丽','["doubao","yuanbao"]',96,'active','2026-08-04T02:18:00Z','2026-07-21T09:10:00Z'),
('proj-auto','org-auto','新能源品牌监测','蔚来','["doubao","yuanbao"]',72,'active','2026-08-04T02:12:00Z','2026-07-24T09:10:00Z'),
('proj-beauty','org-beauty','护肤品类监测','澄光','["doubao"]',38,'paused','2026-08-03T08:30:00Z','2026-07-28T09:10:00Z');
--> statement-breakpoint
INSERT INTO `account_pools` (`id`,`name`,`platform`,`mode`,`status`,`daily_budget`,`created_at`) VALUES
('pool-doubao-app','豆包 App 主池','doubao','app','active',120,'2026-08-01T08:00:00Z'),
('pool-yuanbao-app','元宝 App 主池','yuanbao','app','active',100,'2026-08-01T08:00:00Z'),
('pool-doubao-api','豆包 API 生产池','doubao','api','active',600,'2026-08-01T08:00:00Z'),
('pool-yuanbao-api','混元 API 生产池','yuanbao','api','active',500,'2026-08-01T08:00:00Z');
--> statement-breakpoint
INSERT INTO `collector_accounts` (`id`,`pool_id`,`platform`,`label`,`auth_type`,`credential_ref`,`status`,`daily_budget`,`today_used`,`success_rate`,`last_success_at`,`cooldown_until`,`error_streak`,`owner`,`note`,`created_at`) VALUES
('acc-db-001','pool-doubao-app','doubao','DB-001','扫码登录','secret/doubao/app/001','healthy',30,18,98.4,'2026-08-04T02:18:00Z',NULL,0,'内部运营','固定测试环境 A','2026-08-01T08:10:00Z'),
('acc-db-002','pool-doubao-app','doubao','DB-002','手机号登录','secret/doubao/app/002','busy',30,16,96.8,'2026-08-04T02:17:00Z',NULL,0,'内部运营','固定测试环境 B','2026-08-01T08:10:00Z'),
('acc-db-003','pool-doubao-app','doubao','DB-003','扫码登录','secret/doubao/app/003','cooldown',30,22,91.2,'2026-08-04T01:42:00Z','2026-08-04T03:10:00Z',1,'内部运营','频率保护冷却中','2026-08-01T08:10:00Z'),
('acc-db-004','pool-doubao-app','doubao','DB-004','手机号登录','secret/doubao/app/004','needs_login',30,0,88.6,'2026-08-03T11:20:00Z',NULL,3,'内部运营','等待人工重新登录','2026-08-01T08:10:00Z'),
('acc-yb-001','pool-yuanbao-app','yuanbao','YB-001','微信扫码','secret/yuanbao/app/001','healthy',25,14,97.7,'2026-08-04T02:12:00Z',NULL,0,'内部运营','固定测试环境 C','2026-08-01T08:10:00Z'),
('acc-yb-002','pool-yuanbao-app','yuanbao','YB-002','QQ 扫码','secret/yuanbao/app/002','healthy',25,12,95.9,'2026-08-04T02:08:00Z',NULL,0,'内部运营','固定测试环境 D','2026-08-01T08:10:00Z'),
('acc-yb-003','pool-yuanbao-app','yuanbao','YB-003','微信扫码','secret/yuanbao/app/003','paused',25,5,93.1,'2026-08-03T15:35:00Z',NULL,0,'内部运营','人工暂停排查','2026-08-01T08:10:00Z'),
('acc-db-api-01','pool-doubao-api','doubao','DB-API-PROD','API Key','secret/doubao/api/prod','healthy',600,126,99.8,'2026-08-04T02:19:00Z',NULL,0,'系统','生产推理接入点','2026-08-01T08:10:00Z'),
('acc-yb-api-01','pool-yuanbao-api','yuanbao','YB-API-PROD','API Key','secret/yuanbao/api/prod','healthy',500,94,99.5,'2026-08-04T02:19:00Z',NULL,0,'系统','生产 OpenAI 兼容接口','2026-08-01T08:10:00Z');
--> statement-breakpoint
INSERT INTO `collector_tasks` (`id`,`project_id`,`platform`,`prompt_text`,`account_id`,`status`,`priority`,`attempt`,`scheduled_at`,`completed_at`,`error_code`) VALUES
('task-001','proj-watch','doubao','高级手表品牌有哪些值得推荐？','acc-db-002','running','high',1,'2026-08-04T02:16:00Z',NULL,NULL),
('task-002','proj-watch','yuanbao','十万元以上机械表有哪些值得买？','acc-yb-001','completed','normal',1,'2026-08-04T02:10:00Z','2026-08-04T02:12:00Z',NULL),
('task-003','proj-auto','doubao','三十万元左右新能源 SUV 怎么选？',NULL,'queued','normal',1,'2026-08-04T02:20:00Z',NULL,NULL),
('task-004','proj-watch','doubao','百达翡丽为什么保值？','acc-db-004','failed','high',2,'2026-08-04T01:54:00Z',NULL,'AUTH_EXPIRED'),
('task-005','proj-auto','yuanbao','蔚来和理想的服务体系怎么比较？','acc-yb-002','completed','normal',1,'2026-08-04T02:05:00Z','2026-08-04T02:08:00Z',NULL),
('task-006','proj-watch','yuanbao','商务男士手表推荐',NULL,'queued','normal',1,'2026-08-04T02:24:00Z',NULL,NULL),
('task-007','proj-beauty','doubao','敏感肌面霜怎么选？',NULL,'paused','low',1,'2026-08-04T02:30:00Z',NULL,NULL);
--> statement-breakpoint
INSERT INTO `collector_events` (`id`,`account_id`,`task_id`,`event_type`,`severity`,`message`,`acknowledged`,`created_at`) VALUES
('evt-001','acc-db-004','task-004','auth_expired','critical','DB-004 登录态已过期，需要人工扫码重新登录',0,'2026-08-04T01:55:00Z'),
('evt-002','acc-db-003',NULL,'rate_limited','warning','DB-003 连续触发频率保护，已自动冷却 60 分钟',0,'2026-08-04T02:10:00Z'),
('evt-003','acc-yb-003',NULL,'manual_pause','info','YB-003 由运营人员手动暂停',1,'2026-08-03T15:40:00Z'),
('evt-004','acc-yb-api-01',NULL,'health_check','info','混元 API 生产池健康检查通过',1,'2026-08-04T02:19:00Z');
--> statement-breakpoint
INSERT INTO `admin_audit_events` (`id`,`actor`,`action`,`subject_type`,`subject_id`,`message`,`created_at`) VALUES
('audit-001','系统','account_cooldown','collector_account','acc-db-003','DB-003 进入自动冷却', '2026-08-04T02:10:00Z'),
('audit-002','胡老师','account_paused','collector_account','acc-yb-003','暂停 YB-003 进行环境排查', '2026-08-03T15:40:00Z'),
('audit-003','系统','task_completed','collector_task','task-002','元宝回答采集并入库成功', '2026-08-04T02:12:00Z'),
('audit-004','林琳','project_updated','client_project','proj-auto','新能源品牌监测新增 12 条提示词', '2026-08-03T10:20:00Z');
--> statement-breakpoint
PRAGMA optimize;
