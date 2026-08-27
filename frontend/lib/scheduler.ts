import { env } from "@/db/runtime";
import { PLATFORM_PROFILES, PLATFORMS, safeJsonArray, type Platform } from "@/lib/collection";

type ScheduleRow = {
  id: string;
  organizationId: string;
  projectId: string;
  frequency: "daily" | "weekly" | "monthly";
  timezone: string;
  localRunTime: string;
  promptLimit: number;
  lastGeneratedForDate: string | null;
};

type PromptRow = {
  id: string;
  targetPlatforms: string;
};

type ModelRow = {
  provider: Platform;
  modelId: string;
  tier: "flagship" | "secondary" | "analysis";
  supportsDirect: number;
  supportsWebSearch: number;
};

type PolicyRow = {
  platform: Platform;
  maxAttempts: number;
};

function zonedParts(date: Date, timezone: string) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, number>>((result, part) => {
    if (part.type !== "literal") result[part.type] = Number(part.value);
    return result;
  }, {});
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}

function timezoneOffset(date: Date, timezone: string) {
  const part = zonedParts(date, timezone);
  return Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second) - date.getTime();
}

function localToUtc(local: { year: number; month: number; day: number; hour: number; minute: number }, timezone: string) {
  const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0);
  let candidate = new Date(wallClock - timezoneOffset(new Date(wallClock), timezone));
  candidate = new Date(wallClock - timezoneOffset(candidate, timezone));
  return candidate;
}

function dateKey(date: Date, timezone: string) {
  const part = zonedParts(date, timezone);
  return `${part.year}-${String(part.month).padStart(2, "0")}-${String(part.day).padStart(2, "0")}`;
}

function nextRunAt(now: Date, schedule: ScheduleRow) {
  const current = zonedParts(now, schedule.timezone);
  const calendar = new Date(Date.UTC(current.year, current.month - 1, current.day));
  if (schedule.frequency === "monthly") calendar.setUTCMonth(calendar.getUTCMonth() + 1);
  else calendar.setUTCDate(calendar.getUTCDate() + (schedule.frequency === "weekly" ? 7 : 1));
  const [hour, minute] = schedule.localRunTime.split(":").map(Number);
  return localToUtc({
    year: calendar.getUTCFullYear(),
    month: calendar.getUTCMonth() + 1,
    day: calendar.getUTCDate(),
    hour: Number.isFinite(hour) ? hour : 2,
    minute: Number.isFinite(minute) ? minute : 0,
  }, schedule.timezone).toISOString();
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export async function generateMonitoringRuns(options: { now?: Date; projectId?: string | null } = {}) {
  const current = options.now ?? new Date();
  const now = current.toISOString();
  const projectId = String(options.projectId ?? "").trim() || null;
  const scheduleSql = `SELECT s.id, s.organization_id AS organizationId, s.project_id AS projectId,
    s.frequency, s.timezone, s.local_run_time AS localRunTime, s.prompt_limit AS promptLimit,
    s.last_generated_for_date AS lastGeneratedForDate
    FROM monitoring_schedules s JOIN projects p ON p.id = s.project_id
    WHERE s.enabled = 1 AND p.status = 'active'
      ${projectId ? "AND s.project_id = ?" : "AND (s.next_run_at IS NULL OR s.next_run_at <= ?)"}
    ORDER BY COALESCE(s.next_run_at, s.created_at) ASC`;
  const schedules = (await env.DB.prepare(scheduleSql).bind(projectId ?? now).all<ScheduleRow>()).results;
  const models = (await env.DB.prepare(`SELECT provider, model_id AS modelId, tier,
    supports_direct AS supportsDirect, supports_web_search AS supportsWebSearch
    FROM provider_models WHERE enabled = 1 ORDER BY provider, CASE tier WHEN 'flagship' THEN 1 WHEN 'secondary' THEN 2 ELSE 3 END`).all<ModelRow>()).results;
  const policies = (await env.DB.prepare("SELECT platform, max_attempts AS maxAttempts FROM collection_policies WHERE enabled = 1").all<PolicyRow>()).results;
  const policyMap = new Map(policies.map((policy) => [policy.platform, policy]));
  let createdRuns = 0;
  const details: Array<{ projectId: string; date: string; prompts: number; combinations: number; createdRuns: number }> = [];

  for (const schedule of schedules) {
    const runDate = dateKey(current, schedule.timezone);
    if (!projectId && schedule.lastGeneratedForDate === runDate) continue;
    const prompts = (await env.DB.prepare(`SELECT id, target_platforms AS targetPlatforms FROM prompts
      WHERE organization_id = ? AND project_id = ? AND active = 1 ORDER BY created_at ASC, id ASC LIMIT ?`)
      .bind(schedule.organizationId, schedule.projectId, Math.max(1, Math.min(50, Number(schedule.promptLimit) || 10))).all<PromptRow>()).results;
    const statements: Array<ReturnType<typeof env.DB.prepare>> = [];
    let combinations = 0;
    for (const prompt of prompts) {
      const targets = safeJsonArray(prompt.targetPlatforms, [...PLATFORMS]).filter((value): value is Platform => PLATFORMS.includes(value as Platform));
      for (const capability of models.filter((model) => targets.includes(model.provider) && policyMap.has(model.provider))) {
        const modes = [capability.supportsDirect ? "direct" : null, capability.supportsWebSearch ? "web_search" : null].filter(Boolean) as Array<"direct" | "web_search">;
        for (const mode of modes) {
          combinations += 1;
          const uniqueKey = `schedule:${runDate}:${schedule.projectId}:${prompt.id}:${capability.provider}:${capability.modelId}:${mode}`;
          statements.push(env.DB.prepare(`INSERT OR IGNORE INTO runs
            (id,organization_id,project_id,prompt_id,platform,region,model_version,model_tier,response_mode,collector_version,execution_mode,source_url,scheduled_at,status,attempt,unique_run_key,priority,max_attempts,created_at)
            VALUES (?,?,?,?,?,'CN',?,?,?,'quarzion-api-worker/2.0.0','official_api',?,?,'queued',1,?,50,?,?)`)
            .bind(`run-${crypto.randomUUID()}`, schedule.organizationId, schedule.projectId, prompt.id, capability.provider, capability.modelId, capability.tier, mode, PLATFORM_PROFILES[capability.provider].url, now, uniqueKey, policyMap.get(capability.provider)?.maxAttempts ?? 3, now));
        }
      }
    }
    let scheduleCreated = 0;
    for (const group of chunks(statements, 40)) {
      const results = await env.DB.batch(group);
      scheduleCreated += results.reduce((sum, result) => sum + Number(result.meta?.changes ?? 0), 0);
    }
    await env.DB.batch([
      env.DB.prepare("UPDATE monitoring_schedules SET last_generated_for_date = ?, next_run_at = ?, updated_at = ? WHERE id = ?")
        .bind(runDate, nextRunAt(current, schedule), now, schedule.id),
      env.DB.prepare("INSERT INTO audit_events (id,organization_id,project_id,event_type,subject_type,subject_id,message,created_at) VALUES (?,?,?,'monitoring_runs_generated','monitoring_schedule',?,?,?)")
        .bind(crypto.randomUUID(), schedule.organizationId, schedule.projectId, schedule.id, `生成 ${scheduleCreated} 条官方 API 监测任务（${prompts.length} 条提示词，${combinations} 个有效组合）`, now),
    ]);
    createdRuns += scheduleCreated;
    details.push({ projectId: schedule.projectId, date: runDate, prompts: prompts.length, combinations, createdRuns: scheduleCreated });
  }
  return { schedules: details.length, createdRuns, details, generatedAt: now };
}
