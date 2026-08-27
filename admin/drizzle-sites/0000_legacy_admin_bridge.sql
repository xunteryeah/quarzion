ALTER TABLE organizations RENAME TO legacy_admin_organizations_20260820;
--> statement-breakpoint
ALTER TABLE client_projects RENAME TO legacy_admin_client_projects_20260820;
--> statement-breakpoint
ALTER TABLE account_pools RENAME TO legacy_admin_account_pools_20260820;
--> statement-breakpoint
ALTER TABLE collector_accounts RENAME TO legacy_admin_collector_accounts_20260820;
--> statement-breakpoint
ALTER TABLE collector_tasks RENAME TO legacy_admin_collector_tasks_20260820;
--> statement-breakpoint
ALTER TABLE collector_events RENAME TO legacy_admin_collector_events_20260820;
--> statement-breakpoint
ALTER TABLE admin_audit_events RENAME TO legacy_admin_audit_events_20260820;
--> statement-breakpoint
DROP INDEX IF EXISTS projects_org_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS accounts_pool_status_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS accounts_label_uidx;
--> statement-breakpoint
DROP INDEX IF EXISTS tasks_status_platform_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS tasks_project_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS events_severity_time_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS admin_audit_time_idx;
