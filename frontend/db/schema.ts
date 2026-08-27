import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  region: text("region").notNull().default("CN"),
  language: text("language").notNull().default("zh-CN"),
  createdAt: text("created_at").notNull(),
});

export const brands = sqliteTable(
  "brands",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    name: text("name").notNull(),
    canonicalName: text("canonical_name").notNull(),
    website: text("website"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("active"),
  },
  (table) => [index("brands_project_idx").on(table.projectId)],
);

export const brandAliases = sqliteTable(
  "brand_aliases",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    brandId: text("brand_id").notNull(),
    alias: text("alias").notNull(),
    status: text("status").notNull().default("pending"),
    detectedCount: integer("detected_count").notNull().default(0),
    source: text("source").notNull().default("parser"),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("aliases_project_idx").on(table.projectId),
    uniqueIndex("aliases_brand_alias_uidx").on(table.brandId, table.alias),
  ],
);

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
});

export const prompts = sqliteTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    topicId: text("topic_id").notNull(),
    queryText: text("query_text").notNull(),
    intent: text("intent").notNull(),
    isBranded: integer("is_branded", { mode: "boolean" }).notNull().default(false),
    targetPlatforms: text("target_platforms").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("prompts_project_idx").on(table.projectId)],
);

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    promptId: text("prompt_id").notNull(),
    platform: text("platform").notNull(),
    scheduledAt: text("scheduled_at").notNull(),
    status: text("status").notNull(),
    attempt: integer("attempt").notNull().default(1),
    durationMs: integer("duration_ms"),
    collectorVersion: text("collector_version").notNull().default("collector-interface/1.0"),
    rawText: text("raw_text"),
    errorMessage: text("error_message"),
    parsedAt: text("parsed_at"),
    uniqueRunKey: text("unique_run_key").notNull(),
  },
  (table) => [
    index("runs_project_status_idx").on(table.projectId, table.status),
    index("runs_prompt_idx").on(table.promptId),
    uniqueIndex("runs_unique_key_uidx").on(table.uniqueRunKey),
  ],
);

export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    projectId: text("project_id").notNull(),
    answerText: text("answer_text").notNull(),
    mentionsPrimary: integer("mentions_primary", { mode: "boolean" }).notNull(),
    primaryPosition: integer("primary_position"),
    sentimentScore: real("sentiment_score"),
    parserVersion: text("parser_version").notNull().default("entity-parser/1.0"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("answers_run_uidx").on(table.runId),
    index("answers_project_idx").on(table.projectId),
  ],
);

export const answerBrandMentions = sqliteTable(
  "answer_brand_mentions",
  {
    id: text("id").primaryKey(),
    answerId: text("answer_id").notNull(),
    brandId: text("brand_id").notNull(),
    position: integer("position").notNull(),
    mentionCount: integer("mention_count").notNull().default(1),
    sentimentScore: real("sentiment_score").notNull(),
  },
  (table) => [index("mentions_answer_idx").on(table.answerId)],
);

export const citations = sqliteTable(
  "citations",
  {
    id: text("id").primaryKey(),
    answerId: text("answer_id").notNull(),
    projectId: text("project_id").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    title: text("title").notNull(),
    sourceType: text("source_type").notNull(),
    mentionsPrimary: integer("mentions_primary", { mode: "boolean" }).notNull().default(false),
    firstSeenAt: text("first_seen_at").notNull(),
  },
  (table) => [
    index("citations_project_domain_idx").on(table.projectId, table.domain),
    index("citations_answer_idx").on(table.answerId),
  ],
);

export const optimizationActions = sqliteTable(
  "optimization_actions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("planned"),
    priority: text("priority").notNull().default("medium"),
    owner: text("owner").notNull(),
    targetPlatforms: text("target_platforms").notNull(),
    targetPromptIds: text("target_prompt_ids").notNull(),
    publishedUrl: text("published_url"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("actions_project_idx").on(table.projectId)],
);

export const evidenceSnapshots = sqliteTable(
  "evidence_snapshots",
  {
    id: text("id").primaryKey(),
    actionId: text("action_id").notNull(),
    phase: text("phase").notNull(),
    platform: text("platform").notNull(),
    promptId: text("prompt_id"),
    answersCount: integer("answers_count").notNull(),
    mentionRate: real("mention_rate").notNull(),
    avgPosition: real("avg_position"),
    citationCount: integer("citation_count").notNull(),
    recordedAt: text("recorded_at").notNull(),
  },
  (table) => [index("evidence_action_idx").on(table.actionId)],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    eventType: text("event_type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("audit_project_idx").on(table.projectId, table.createdAt)],
);
