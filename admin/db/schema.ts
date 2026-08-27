import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("standard"),
  status: text("status").notNull().default("active"),
  owner: text("owner").notNull(),
  createdAt: text("created_at").notNull(),
});

export const clientProjects = sqliteTable(
  "client_projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    primaryBrand: text("primary_brand").notNull(),
    platforms: text("platforms").notNull(),
    promptCount: integer("prompt_count").notNull().default(0),
    runStatus: text("run_status").notNull().default("active"),
    lastRunAt: text("last_run_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("projects_org_idx").on(table.organizationId)],
);

export const accountPools = sqliteTable("account_pools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  mode: text("mode").notNull().default("app"),
  status: text("status").notNull().default("active"),
  dailyBudget: integer("daily_budget").notNull().default(100),
  createdAt: text("created_at").notNull(),
});

export const collectorAccounts = sqliteTable(
  "collector_accounts",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id").notNull(),
    platform: text("platform").notNull(),
    label: text("label").notNull(),
    authType: text("auth_type").notNull(),
    credentialRef: text("credential_ref").notNull(),
    status: text("status").notNull().default("pending"),
    dailyBudget: integer("daily_budget").notNull().default(30),
    todayUsed: integer("today_used").notNull().default(0),
    successRate: real("success_rate").notNull().default(100),
    lastSuccessAt: text("last_success_at"),
    cooldownUntil: text("cooldown_until"),
    errorStreak: integer("error_streak").notNull().default(0),
    owner: text("owner").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("accounts_pool_status_idx").on(table.poolId, table.status),
    uniqueIndex("accounts_label_uidx").on(table.label),
  ],
);

export const collectorTasks = sqliteTable(
  "collector_tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    platform: text("platform").notNull(),
    promptText: text("prompt_text").notNull(),
    accountId: text("account_id"),
    status: text("status").notNull().default("queued"),
    priority: text("priority").notNull().default("normal"),
    attempt: integer("attempt").notNull().default(1),
    scheduledAt: text("scheduled_at").notNull(),
    completedAt: text("completed_at"),
    errorCode: text("error_code"),
  },
  (table) => [
    index("tasks_status_platform_idx").on(table.status, table.platform),
    index("tasks_project_idx").on(table.projectId),
  ],
);

export const collectorEvents = sqliteTable(
  "collector_events",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id"),
    taskId: text("task_id"),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull().default("info"),
    message: text("message").notNull(),
    acknowledged: integer("acknowledged", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("events_severity_time_idx").on(table.severity, table.createdAt)],
);

export const adminAuditEvents = sqliteTable(
  "admin_audit_events",
  {
    id: text("id").primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("admin_audit_time_idx").on(table.createdAt)],
);
