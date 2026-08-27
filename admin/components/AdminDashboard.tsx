"use client";

import { FormEvent, useEffect, useState } from "react";

type Page =
  | "overview"
  | "clients"
  | "leads"
  | "accounts"
  | "tasks"
  | "evidence"
  | "exceptions"
  | "audit";
type Organization = {
  id: string;
  name: string;
  plan: string;
  status: string;
  owner: string;
  created_at: string;
};
type Project = {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  primary_brand: string;
  platforms: string[];
  prompt_count: number;
  run_status: string;
  last_run_at: string | null;
};
type Invitation = {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  role: string;
  status: string;
  delivery_status: string;
  delivery_error: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};
type Pool = {
  id: string;
  name: string;
  platform: string;
  mode: string;
  status: string;
  daily_budget: number;
  account_count: number;
  healthy_count: number;
  today_used: number;
};
type Account = {
  id: string;
  pool_id: string;
  pool_name: string;
  pool_mode: string;
  platform: string;
  label: string;
  auth_type: string;
  credential_ref: string;
  status: string;
  daily_budget: number;
  today_used: number;
  success_rate: number;
  last_success_at: string | null;
  cooldown_until: string | null;
  error_streak: number;
  owner: string;
  note: string;
};
type Task = {
  id: string;
  project_id: string;
  project_name: string;
  platform: string;
  prompt_text: string;
  account_id: string | null;
  account_label: string | null;
  worker_id: string | null;
  status: string;
  priority: string;
  attempt: number;
  max_attempts: number;
  execution_mode: string;
  response_mode: string;
  model_version: string | null;
  model_tier: string | null;
  search_performed: number;
  provider_request_id: string | null;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  cost_micros: number | null;
  region: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  lease_expires_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  failure_category: string | null;
  error_message: string | null;
  response_sha256: string | null;
  provider_response_sha256: string | null;
  source_url: string | null;
  answer_text: string | null;
  citation_count: number;
  collector_version: string;
};
type Event = {
  id: string;
  account_id: string | null;
  account_label: string | null;
  task_id: string | null;
  event_type: string;
  severity: string;
  message: string;
  acknowledged: number;
  status: string;
  occurrence_count: number;
  platform: string | null;
  first_seen_at: string;
  created_at: string;
};
type Worker = {
  id: string;
  label: string;
  status: string;
  collector_version: string;
  supported_platforms: string[];
  execution_mode: string;
  current_run_id: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};
type Policy = {
  platform: string;
  display_name: string;
  enabled: number;
  paused_reason: string | null;
  max_concurrency: number;
  timeout_seconds: number;
  max_attempts: number;
  base_retry_seconds: number;
  daily_budget: number;
  execution_mode: string;
  updated_at: string;
};
type Artifact = {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  run_id: string;
  answer_id: string | null;
  kind: string;
  mime_type: string;
  sha256: string;
  byte_size: number;
  source_url: string | null;
  captured_at: string;
  platform: string;
  region: string;
  model_version: string | null;
  collector_version: string | null;
  page_title: string | null;
  answer_text: string | null;
  response_sha256: string | null;
};
type ContactLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  message: string;
  source: string;
  status: string;
  delivery_status: string;
  delivery_error: string | null;
  created_at: string;
  updated_at: string;
};
type Audit = {
  id: string;
  actor: string;
  action: string;
  subject_type: string;
  subject_id: string;
  message: string;
  created_at: string;
};
type AdminData = {
  organizations: Organization[];
  projects: Project[];
  invitations: Invitation[];
  contacts: ContactLead[];
  pools: Pool[];
  accounts: Account[];
  tasks: Task[];
  events: Event[];
  workers: Worker[];
  policies: Policy[];
  artifacts: Artifact[];
  emergencyStop: { enabled?: boolean; reason?: string | null };
  audits: Audit[];
  generatedAt: string;
  currentUser?: { displayName?: string; email?: string };
  invitationUrl?: string;
};

const nav: Array<{ id: Page; label: string; icon: string }> = [
  { id: "overview", label: "运营总览", icon: "▥" },
  { id: "clients", label: "客户项目", icon: "◎" },
  { id: "leads", label: "咨询线索", icon: "◇" },
  { id: "accounts", label: "采集器与策略", icon: "◉" },
  { id: "tasks", label: "采集任务", icon: "≡" },
  { id: "evidence", label: "证据抽检", icon: "▤" },
  { id: "exceptions", label: "异常中心", icon: "△" },
  { id: "audit", label: "审计记录", icon: "⌁" },
];

const pageTitles: Record<Page, [string, string]> = {
  overview: ["运营总览", "查看所有客户、采集器与任务的实时健康状态"],
  clients: ["客户项目", "管理客户、项目套餐、平台和运行状态"],
  leads: ["咨询线索", "查看官网预约、邮件投递与后续联系状态"],
  accounts: [
    "采集器与策略",
    "管理官方 API Worker、平台开关、并发预算与紧急停止",
  ],
  tasks: ["采集任务", "查看任务排队、执行、失败与重试情况"],
  evidence: ["证据抽检", "核对原始回答、官方请求 ID、引用来源和内容哈希"],
  exceptions: ["异常中心", "集中处理供应商错误、限流、超时和空回答"],
  audit: ["审计记录", "追踪每一次内部运营和系统自动操作"],
};

const statusLabels: Record<string, string> = {
  active: "运行中",
  paused: "已暂停",
  healthy: "健康",
  busy: "使用中",
  cooldown: "冷却中",
  needs_login: "需登录",
  pending: "待验证",
  queued: "排队中",
  running: "采集中",
  parsed: "已完成",
  completed: "已完成",
  failed: "失败",
  blocked: "被阻断",
  online: "在线",
  offline: "离线",
  draining: "排空中",
  disabled: "已禁用",
  acknowledged: "已确认",
  resolved: "已解决",
  warning: "警告",
  critical: "紧急",
  info: "信息",
  accepted: "已接受",
  revoked: "已撤销",
  expired: "已过期",
  delivering: "发送中",
  retry: "等待重试",
  delivered: "已送达",
  cancelled: "已取消",
  not_queued: "未入队",
  received: "新咨询",
  contacted: "已联系",
  qualified: "有效线索",
  closed: "已关闭",
  spam: "垃圾信息",
};

const platformLabels: Record<string, string> = {
  doubao: "豆包",
  qwen: "千问",
  deepseek: "DeepSeek",
};

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {statusLabels[value] ?? value}
    </span>
  );
}

function DeliveryStatus({ value }: { value: string }) {
  const labels: Record<string, string> = {
    pending: "待发送",
    delivering: "发送中",
    retry: "等待重试",
    delivered: "已送达",
    failed: "发送失败",
    cancelled: "已取消",
    not_queued: "未入队",
  };
  return (
    <span className={`status status-${value}`}>
      <i />
      {labels[value] ?? value}
    </span>
  );
}

function Platform({ value, mode }: { value: string; mode?: string }) {
  return (
    <span className={`platform platform-${value}`}>
      <i>{value === "doubao" ? "豆" : value === "deepseek" ? "深" : "千"}</i>
      <b>{platformLabels[value] ?? value}</b>
      {mode ? <small>{mode === "api" ? "API" : mode}</small> : null}
    </span>
  );
}

function responseMode(value: string) {
  return value === "web_search" ? "联网搜索" : "直接回答";
}

function Metric({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: string;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
      <i />
    </article>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "后台数据加载失败");
    setData(result);
  }

  useEffect(() => {
    let current = true;
    fetch("/api/admin")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "后台数据加载失败");
        return result as AdminData;
      })
      .then((result) => {
        if (current) setData(result);
      })
      .catch((reason) => {
        if (current)
          setError(
            reason instanceof Error ? reason.message : "后台数据加载失败",
          );
      });
    return () => {
      current = false;
    };
  }, []);

  async function command(
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) {
    setBusy(token);
    setError(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "操作失败");
      setData(result);
      if (result.invitationUrl) setInvitationUrl(String(result.invitationUrl));
      setToast(success);
      window.setTimeout(() => setToast(null), 2600);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  const openExceptions =
    data?.events.filter((event) => !Number(event.acknowledged)) ?? [];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <button className="admin-brand" onClick={() => setPage("overview")}>
          <span className="admin-logo-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <div>
            <b>Quarzion</b>
            <small>ADMIN CONSOLE</small>
          </div>
        </button>
        <div className="internal-badge">
          <i>◆</i>
          <div>
            <b>内部运营系统</b>
            <small>客户不可见</small>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const count =
              item.id === "exceptions"
                ? openExceptions.length
                : item.id === "leads"
                  ? (data?.contacts.filter((lead) => lead.status === "received")
                      .length ?? 0)
                  : 0;
            return (
              <button
                key={item.id}
                className={page === item.id ? "active" : ""}
                onClick={() => setPage(item.id)}
              >
                <i>{item.icon}</i>
                <span>{item.label}</span>
                {count ? <em>{count}</em> : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-health">
          <div>
            <span>系统状态</span>
            <b>
              <i />
              {data?.emergencyStop.enabled ? "采集已紧急停止" : "采集服务待命"}
            </b>
          </div>
          <small>
            {data?.workers.filter((worker) => worker.status === "online")
              .length ?? 0}{" "}
            个采集器在线
          </small>
        </div>
        <a
          className="client-link"
          href="https://app.quarzion.com"
          target="_blank"
          rel="noreferrer"
        >
          ↗ 打开客户门户
        </a>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <label className="global-search">
            ⌕
            <input
              aria-label="搜索客户、采集器或任务"
              placeholder="搜索客户、采集器、任务…"
            />
          </label>
          <div className="topbar-actions">
            <button
              className="notification-button"
              aria-label={`查看异常通知，共 ${openExceptions.length} 条待处理`}
              onClick={() => setPage("exceptions")}
            >
              ♢{openExceptions.length ? <i>{openExceptions.length}</i> : null}
            </button>
            <div className="admin-user">
              <span>胡</span>
              <div>
                <b>{data?.currentUser?.displayName ?? "胡老师"}</b>
                <small>超级管理员</small>
              </div>
            </div>
          </div>
        </header>
        <div className="admin-content">
          <div className={`page-head page-head-${page}`}>
            {page === "overview" ? (
              <div className="admin-cosmic-field" aria-hidden="true">
                <i />
                <i />
                <span />
              </div>
            ) : null}
            <div>
              <p>QUARZION / ADMIN CONTROL / {pageTitles[page][0]}</p>
              <h1>
                {page === "overview" ? (
                  <>
                    系统正在<span>运行。</span>
                  </>
                ) : (
                  pageTitles[page][0]
                )}
              </h1>
              <span>{pageTitles[page][1]}</span>
            </div>
            <small className="sync-time">
              <i /> LIVE · 数据更新{" "}
              {data ? formatTime(data.generatedAt) : "连接中"}
            </small>
          </div>
          {error ? (
            <div className="error-banner" role="alert">
              <span>△ {error}</span>
              <button onClick={() => load().catch(() => undefined)}>
                重新连接
              </button>
            </div>
          ) : null}
          {!data ? <LoadingPanel /> : null}
          {data && page === "overview" ? (
            <Overview data={data} command={command} busy={busy} />
          ) : null}
          {data && page === "clients" ? (
            <Clients
              data={data}
              command={command}
              busy={busy}
              invitationUrl={invitationUrl}
              clearInvitation={() => setInvitationUrl(null)}
            />
          ) : null}
          {data && page === "leads" ? (
            <Leads data={data} command={command} busy={busy} />
          ) : null}
          {data && page === "accounts" ? (
            <Accounts data={data} command={command} busy={busy} />
          ) : null}
          {data && page === "tasks" ? (
            <Tasks data={data} command={command} busy={busy} />
          ) : null}
          {data && page === "evidence" ? <Evidence data={data} /> : null}
          {data && page === "exceptions" ? (
            <Exceptions data={data} command={command} busy={busy} />
          ) : null}
          {data && page === "audit" ? <AuditLog data={data} /> : null}
        </div>
      </main>
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          ✓ {toast}
        </div>
      ) : null}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="loading-panel">
      <span>G</span>
      <div>
        <b>正在连接运营数据</b>
        <small>检查客户项目、采集器与任务状态…</small>
      </div>
    </div>
  );
}

function Overview({
  data,
  command,
  busy,
}: {
  data: AdminData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const onlineWorkers = data.workers.filter(
    (worker) => worker.status === "online",
  ).length;
  const queued = data.tasks.filter((task) => task.status === "queued").length;
  const exceptions = data.events.filter((event) => !Number(event.acknowledged));
  const completed = data.tasks.filter(
    (task) => task.status === "parsed",
  ).length;
  const completion = data.tasks.length
    ? (completed / data.tasks.length) * 100
    : 0;
  return (
    <>
      <section className="metric-row">
        <Metric
          label="活跃客户项目"
          value={
            data.projects.filter((project) => project.run_status === "active")
              .length
          }
          hint={`共 ${data.organizations.length} 个客户组织`}
          tone="blue"
        />
        <Metric
          label="在线采集器"
          value={`${onlineWorkers}/${data.workers.length}`}
          hint="上海官方 API Worker"
          tone="green"
        />
        <Metric
          label="待执行任务"
          value={queued}
          hint={`${data.tasks.filter((task) => task.status === "running").length} 个正在采集`}
          tone="violet"
        />
        <Metric
          label="待处理异常"
          value={exceptions.length}
          hint="需要运营人员介入"
          tone={exceptions.length ? "orange" : "green"}
        />
      </section>
      <div className="overview-grid">
        <section className="panel platform-overview">
          <div className="panel-head">
            <div>
              <h2>采集平台状态</h2>
              <p>单区域 · 官方 API 采集</p>
            </div>
            <button
              className="text-button"
              disabled
              title="请在“采集器与策略”中管理"
            >
              策略详情 →
            </button>
          </div>
          <div className="platform-health-grid">
            {data.policies.map((policy) => {
              const runs = data.tasks.filter(
                (task) => task.platform === policy.platform,
              );
              const terminal = runs.filter((task) =>
                ["parsed", "failed", "blocked"].includes(task.status),
              );
              const finished = terminal.filter(
                (task) => task.status === "parsed",
              ).length;
              const success = terminal.length
                ? `${((finished / terminal.length) * 100).toFixed(0)}%`
                : "—";
              return (
                <article key={policy.platform}>
                  <div className="platform-card-title">
                    <Platform value={policy.platform} />
                    <Status
                      value={Number(policy.enabled) ? "active" : "paused"}
                    />
                  </div>
                  <div className="health-score">
                    <strong>{success}</strong>
                    <span>真实任务成功率</span>
                  </div>
                  <div className="mini-stats">
                    <span>
                      <b>{policy.max_concurrency}</b>并发
                    </span>
                    <span>
                      <b>{policy.daily_budget}</b>日预算
                    </span>
                    <span>
                      <b>{policy.timeout_seconds}s</b>超时
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="panel task-pipeline">
          <div className="panel-head">
            <div>
              <h2>任务流水</h2>
              <p>最近 500 条真实任务</p>
            </div>
            <b>{completion.toFixed(0)}% 完成</b>
          </div>
          <div className="pipeline-chart">
            <div className="pipeline-bar">
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="pipeline-legend">
              <span>
                <i className="complete" />
                已完成 <b>{completed}</b>
              </span>
              <span>
                <i className="running" />
                采集中{" "}
                <b>
                  {
                    data.tasks.filter((task) => task.status === "running")
                      .length
                  }
                </b>
              </span>
              <span>
                <i className="queued" />
                排队中 <b>{queued}</b>
              </span>
              <span>
                <i className="failed" />
                失败{" "}
                <b>
                  {data.tasks.filter((task) => task.status === "failed").length}
                </b>
              </span>
            </div>
          </div>
        </section>
      </div>
      <div className="overview-grid lower">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>需要处理</h2>
              <p>供应商错误、限流、超时与空回答</p>
            </div>
            <span className="count-badge">{exceptions.length}</span>
          </div>
          <div className="exception-list">
            {exceptions.length ? (
              exceptions.slice(0, 4).map((event) => (
                <article key={event.id}>
                  <span className={`severity severity-${event.severity}`}>
                    !
                  </span>
                  <div>
                    <b>{event.message}</b>
                    <small>
                      {event.platform ? platformLabels[event.platform] : "系统"}{" "}
                      · {formatTime(event.created_at)}
                    </small>
                  </div>
                  <button
                    disabled={busy === event.id}
                    onClick={() =>
                      command(
                        { command: "acknowledge_event", eventId: event.id },
                        event.id,
                        "异常已确认",
                      )
                    }
                  >
                    确认
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-state">目前没有待处理异常</div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>最近运营动作</h2>
              <p>系统与管理员审计记录</p>
            </div>
            <button
              className="text-button"
              disabled
              title="请在“审计记录”中查看"
            >
              审计详情 →
            </button>
          </div>
          <div className="audit-mini">
            {data.audits.slice(0, 5).map((audit) => (
              <article key={audit.id}>
                <span>{audit.actor.slice(0, 1)}</span>
                <div>
                  <b>{audit.message}</b>
                  <small>
                    {audit.actor} · {formatTime(audit.created_at)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Clients({
  data,
  command,
  busy,
  invitationUrl,
  clearInvitation,
}: {
  data: AdminData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) => Promise<void>;
  busy: string | null;
  invitationUrl: string | null;
  clearInvitation: () => void;
}) {
  const [form, setForm] = useState<
    "organization" | "project" | "invitation" | null
  >(null);
  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await command(
      {
        command: "create_organization",
        name: values.get("name"),
        slug: values.get("slug"),
        owner: values.get("owner"),
        plan: values.get("plan"),
      },
      "create-organization",
      "客户组织已创建",
    );
    setForm(null);
  }
  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await command(
      {
        command: "create_project",
        organizationId: values.get("organizationId"),
        name: values.get("name"),
        brandName: values.get("brandName"),
        website: values.get("website"),
        region: values.get("region"),
        language: values.get("language"),
      },
      "create-project",
      "客户项目已创建",
    );
    setForm(null);
  }
  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await command(
      {
        command: "create_invitation",
        organizationId: values.get("organizationId"),
        email: values.get("email"),
        role: values.get("role"),
      },
      "create-invitation",
      "一次性邀请已生成",
    );
    setForm(null);
  }
  return (
    <>
      <section className="client-create-grid">
        <button
          onClick={() =>
            setForm(form === "organization" ? null : "organization")
          }
        >
          <span>01</span>
          <b>新建客户公司</b>
          <small>建立独立组织空间</small>
        </button>
        <button
          onClick={() => setForm(form === "project" ? null : "project")}
          disabled={!data.organizations.length}
        >
          <span>02</span>
          <b>新建 GEO 项目</b>
          <small>绑定公司与主品牌</small>
        </button>
        <button
          onClick={() => setForm(form === "invitation" ? null : "invitation")}
          disabled={!data.organizations.length}
        >
          <span>03</span>
          <b>邀请客户成员</b>
          <small>生成 7 天一次性链接</small>
        </button>
      </section>
      {form === "organization" ? (
        <form
          className="client-create-form panel"
          onSubmit={createOrganization}
        >
          <h3>新建客户公司</h3>
          <label>
            公司名称
            <input
              name="name"
              required
              placeholder="例如：上海某某品牌有限公司"
            />
          </label>
          <label>
            英文简称
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              placeholder="例如：example-brand"
            />
          </label>
          <label>
            内部负责人
            <input name="owner" required defaultValue="内部运营" />
          </label>
          <label>
            套餐
            <select name="plan">
              <option value="standard">标准版</option>
              <option value="enterprise">企业版</option>
              <option value="pilot">试点</option>
            </select>
          </label>
          <button
            className="primary-button"
            disabled={busy === "create-organization"}
          >
            创建公司空间
          </button>
        </form>
      ) : null}
      {form === "project" ? (
        <form className="client-create-form panel" onSubmit={createProject}>
          <h3>新建 GEO 项目</h3>
          <label>
            客户公司
            <select name="organizationId" required>
              {data.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            项目名称
            <input name="name" required placeholder="例如：中国市场品牌监测" />
          </label>
          <label>
            主品牌
            <input name="brandName" required placeholder="品牌正式名称" />
          </label>
          <label>
            品牌官网
            <input
              name="website"
              type="url"
              placeholder="https://example.com"
            />
          </label>
          <label>
            地区
            <select name="region">
              <option value="CN">中国大陆</option>
              <option value="HK">中国香港</option>
              <option value="SG">新加坡</option>
            </select>
          </label>
          <label>
            语言
            <select name="language">
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <button
            className="primary-button"
            disabled={busy === "create-project"}
          >
            创建正式项目
          </button>
        </form>
      ) : null}
      {form === "invitation" ? (
        <form className="client-create-form panel" onSubmit={createInvitation}>
          <h3>邀请客户成员</h3>
          <label>
            客户公司
            <select name="organizationId" required>
              {data.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            工作邮箱
            <input
              name="email"
              type="email"
              required
              placeholder="name@company.com"
            />
          </label>
          <label>
            权限
            <select name="role">
              <option value="organization_admin">组织管理员</option>
              <option value="member">成员</option>
              <option value="viewer">只读访客</option>
            </select>
          </label>
          <button
            className="primary-button"
            disabled={busy === "create-invitation"}
          >
            生成一次性邀请
          </button>
        </form>
      ) : null}
      {invitationUrl ? (
        <section className="invitation-result panel">
          <div>
            <small>INVITATION READY</small>
            <h3>邀请链接已经生成</h3>
            <p>链接仅显示这一次，7 天后失效。发送给对应邮箱本人。</p>
          </div>
          <code>{invitationUrl}</code>
          <button
            className="primary-button"
            onClick={() => navigator.clipboard.writeText(invitationUrl)}
          >
            复制链接
          </button>
          <button onClick={clearInvitation}>完成</button>
        </section>
      ) : null}
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h2>客户与项目</h2>
            <p>
              {data.organizations.length} 个客户组织 · {data.projects.length}{" "}
              个项目
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>客户 / 项目</th>
                <th>主品牌</th>
                <th>平台</th>
                <th>提示词</th>
                <th>运行状态</th>
                <th>最近监测</th>
                <th>负责人</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.projects.map((project) => {
                const org = data.organizations.find(
                  (item) => item.id === project.organization_id,
                );
                return (
                  <tr key={project.id}>
                    <td>
                      <span className="project-cell">
                        <i>{project.organization_name.slice(0, 1)}</i>
                        <span>
                          <b>{project.name}</b>
                          <small>{project.organization_name}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <b>{project.primary_brand}</b>
                    </td>
                    <td>
                      <span className="platform-stack">
                        {project.platforms.length ? (
                          project.platforms.map((platform) => (
                            <Platform value={platform} key={platform} />
                          ))
                        ) : (
                          <small className="muted">尚无运行</small>
                        )}
                      </span>
                    </td>
                    <td>{project.prompt_count}</td>
                    <td>
                      <Status value={project.run_status} />
                    </td>
                    <td>{formatTime(project.last_run_at)}</td>
                    <td>{org?.owner ?? "—"}</td>
                    <td>
                      <button
                        className="row-menu"
                        aria-label={`打开 ${project.name} 的更多操作`}
                        disabled
                        title="项目编辑接口尚未开放"
                      >
                        •••
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data.projects.length ? (
            <div className="empty-state">
              先创建客户公司，再建立第一个正式 GEO 项目
            </div>
          ) : null}
        </div>
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h2>客户邀请</h2>
            <p>
              {
                data.invitations.filter((item) => item.status === "pending")
                  .length
              }{" "}
              条等待接受
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>客户公司</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>邀请状态</th>
                <th>邮件状态</th>
                <th>失效时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.organization_name}</td>
                  <td>
                    <b>{invitation.email}</b>
                  </td>
                  <td>
                    {invitation.role === "organization_admin"
                      ? "组织管理员"
                      : invitation.role === "viewer"
                        ? "只读访客"
                        : "成员"}
                  </td>
                  <td>
                    <Status value={invitation.status} />
                  </td>
                  <td>
                    <Status value={invitation.delivery_status} />
                    {invitation.delivery_error ? (
                      <small className="table-sub error-text">
                        {invitation.delivery_error}
                      </small>
                    ) : null}
                  </td>
                  <td>{formatTime(invitation.expires_at)}</td>
                  <td>
                    {invitation.status === "pending" ? (
                      <div className="row-actions">
                        <button
                          className="action-primary"
                          disabled={busy === invitation.id}
                          onClick={() =>
                            command(
                              {
                                command: "resend_invitation",
                                invitationId: invitation.id,
                              },
                              invitation.id,
                              "新邀请已生成，旧链接已失效",
                            )
                          }
                        >
                          重发
                        </button>
                        <button
                          disabled={busy === invitation.id}
                          onClick={() =>
                            command(
                              {
                                command: "revoke_invitation",
                                invitationId: invitation.id,
                              },
                              invitation.id,
                              "邀请已撤销",
                            )
                          }
                        >
                          撤销
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.invitations.length ? (
            <div className="empty-state">尚未发送客户邀请</div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Leads({
  data,
  command,
  busy,
}: {
  data: AdminData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const [status, setStatus] = useState("all");
  const leads = data.contacts.filter(
    (lead) => status === "all" || lead.status === status,
  );
  return (
    <>
      <section className="metric-row">
        <Metric
          label="新咨询"
          value={
            data.contacts.filter((lead) => lead.status === "received").length
          }
          hint="等待首次联系"
          tone="orange"
        />
        <Metric
          label="已联系"
          value={
            data.contacts.filter((lead) => lead.status === "contacted").length
          }
          hint="正在跟进"
          tone="blue"
        />
        <Metric
          label="有效线索"
          value={
            data.contacts.filter((lead) => lead.status === "qualified").length
          }
          hint="可进入销售流程"
          tone="green"
        />
        <Metric
          label="邮件待处理"
          value={
            data.contacts.filter((lead) => lead.delivery_status !== "delivered")
              .length
          }
          hint="队列会自动重试"
          tone="violet"
        />
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="filters">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">全部咨询</option>
              <option value="received">新咨询</option>
              <option value="contacted">已联系</option>
              <option value="qualified">有效线索</option>
              <option value="closed">已关闭</option>
              <option value="spam">垃圾信息</option>
            </select>
          </div>
          <div>
            <h2>官网预约记录</h2>
            <p>咨询内容与邮件投递状态来自统一生产数据库</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>公司 / 联系人</th>
                <th>联系方式</th>
                <th>需求</th>
                <th>线索状态</th>
                <th>邮件状态</th>
                <th>提交时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <span className="project-cell">
                      <i>{lead.company.slice(0, 1)}</i>
                      <span>
                        <b>{lead.company}</b>
                        <small>{lead.name}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    <small className="table-sub">
                      {lead.phone || "未留电话"}
                    </small>
                  </td>
                  <td className="prompt-column">
                    <b>{lead.message}</b>
                    <small>
                      {lead.source} · {lead.id.slice(0, 12)}
                    </small>
                  </td>
                  <td>
                    <Status value={lead.status} />
                  </td>
                  <td>
                    <DeliveryStatus value={lead.delivery_status} />
                    {lead.delivery_error ? (
                      <small className="table-sub error-text">
                        {lead.delivery_error}
                      </small>
                    ) : null}
                  </td>
                  <td>{formatTime(lead.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <a
                        className="action-primary"
                        href={`mailto:${lead.email}`}
                      >
                        写邮件
                      </a>
                      {lead.status === "received" ? (
                        <button
                          disabled={busy === lead.id}
                          onClick={() =>
                            command(
                              {
                                command: "set_contact_status",
                                contactId: lead.id,
                                status: "contacted",
                              },
                              lead.id,
                              "已标记为联系中",
                            )
                          }
                        >
                          已联系
                        </button>
                      ) : null}
                      {lead.status !== "closed" ? (
                        <button
                          disabled={busy === lead.id}
                          onClick={() =>
                            command(
                              {
                                command: "set_contact_status",
                                contactId: lead.id,
                                status: "closed",
                              },
                              lead.id,
                              "咨询已关闭",
                            )
                          }
                        >
                          关闭
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leads.length ? (
            <div className="empty-state">当前筛选条件下没有官网咨询</div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Accounts({
  data,
  command,
  busy,
}: {
  data: AdminData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const stop = Boolean(data.emergencyStop.enabled);
  return (
    <>
      <section className={`security-note ${stop ? "emergency-active" : ""}`}>
        <span>{stop ? "!" : "✓"}</span>
        <div>
          <b>{stop ? "全部采集已紧急停止" : "官方 API 采集已启用"}</b>
          <p>
            {stop
              ? (data.emergencyStop.reason ?? "等待管理员恢复")
              : "当前由上海节点通过豆包、千问和 DeepSeek 官方 API 执行任务。"}
          </p>
        </div>
        <button
          disabled={busy === "emergency-stop"}
          onClick={() =>
            command(
              {
                command: "set_emergency_stop",
                enabled: !stop,
                reason: stop ? null : "管理员从运营台紧急停止",
              },
              "emergency-stop",
              stop ? "全部采集已恢复" : "全部采集已紧急停止",
            )
          }
        >
          {stop ? "恢复全部采集" : "紧急停止"}
        </button>
      </section>
      <div className="pool-cards">
        {data.policies.map((policy) => (
          <article key={policy.platform}>
            <div className="pool-top">
              <Platform value={policy.platform} mode="api" />
              <Status value={Number(policy.enabled) ? "active" : "paused"} />
            </div>
            <h3>{policy.display_name} 官方 API</h3>
            <div className="pool-numbers">
              <span>
                <b>{policy.max_concurrency}</b>最大并发
              </span>
              <span>
                <b>{policy.timeout_seconds}s</b>超时
              </span>
              <span>
                <b>{policy.daily_budget}</b>日预算
              </span>
            </div>
            {policy.paused_reason ? (
              <small className="table-sub error-text">
                {policy.paused_reason}
              </small>
            ) : null}
            <div className="pool-actions">
              <button
                disabled={busy === policy.platform}
                onClick={() =>
                  command(
                    {
                      command: "set_platform_policy",
                      platform: policy.platform,
                      enabled: !Number(policy.enabled),
                      reason: "管理员从运营台暂停",
                    },
                    policy.platform,
                    Number(policy.enabled)
                      ? `${policy.display_name} 已暂停`
                      : `${policy.display_name} 已恢复`,
                  )
                }
              >
                {Number(policy.enabled) ? "暂停平台" : "恢复平台"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h2>采集器实例</h2>
            <p>心跳、版本、当前租约与官方 API 执行状态</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>采集器</th>
                <th>状态</th>
                <th>支持平台</th>
                <th>模式</th>
                <th>当前任务</th>
                <th>版本</th>
                <th>最后心跳</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.workers.map((worker) => (
                <tr key={worker.id}>
                  <td>
                    <b>{worker.label}</b>
                    <small className="table-sub">{worker.id}</small>
                  </td>
                  <td>
                    <Status value={worker.status} />
                  </td>
                  <td>
                    <span className="platform-stack">
                      {worker.supported_platforms.map((platform) => (
                        <Platform value={platform} key={platform} />
                      ))}
                    </span>
                  </td>
                  <td>
                    {worker.execution_mode === "official_api"
                      ? "官方 API"
                      : "历史模式"}
                  </td>
                  <td>
                    {worker.current_run_id ?? (
                      <span className="muted">空闲</span>
                    )}
                  </td>
                  <td>
                    <code>{worker.collector_version}</code>
                  </td>
                  <td>{formatTime(worker.last_seen_at)}</td>
                  <td>
                    <button
                      disabled={busy === worker.id}
                      onClick={() =>
                        command(
                          {
                            command: "set_worker_status",
                            workerId: worker.id,
                            status:
                              worker.status === "disabled"
                                ? "online"
                                : "disabled",
                          },
                          worker.id,
                          worker.status === "disabled"
                            ? "采集器已启用"
                            : "采集器已禁用",
                        )
                      }
                    >
                      {worker.status === "disabled" ? "启用" : "禁用"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.workers.length ? (
            <div className="empty-state">
              尚无采集器登记；部署采集服务后会自动出现
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Tasks({
  data,
  command,
  busy,
}: {
  data: AdminData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const [status, setStatus] = useState("all");
  const tasks = data.tasks.filter(
    (task) => status === "all" || task.status === status,
  );
  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        <div className="filters">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">全部任务</option>
            <option value="queued">排队中</option>
            <option value="running">采集中</option>
            <option value="parsed">已完成</option>
            <option value="failed">失败</option>
            <option value="blocked">被阻断</option>
          </select>
          <label>
            ⌕<input aria-label="搜索问题或项目" placeholder="搜索问题或项目…" />
          </label>
        </div>
        <div className="toolbar-summary">
          <span>
            排队{" "}
            <b>
              {data.tasks.filter((task) => task.status === "queued").length}
            </b>
          </span>
          <span>
            运行{" "}
            <b>
              {data.tasks.filter((task) => task.status === "running").length}
            </b>
          </span>
          <span>
            失败/阻断{" "}
            <b>
              {
                data.tasks.filter((task) =>
                  ["failed", "blocked"].includes(task.status),
                ).length
              }
            </b>
          </span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>任务 / 提示词</th>
              <th>客户项目</th>
              <th>平台</th>
              <th>采集器</th>
              <th>状态</th>
              <th>模型 / 模式</th>
              <th>尝试</th>
              <th>证据哈希</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="prompt-column">
                  <b>{task.prompt_text}</b>
                  <small>
                    {task.id.slice(0, 16)} · {task.collector_version}
                  </small>
                </td>
                <td>{task.project_name}</td>
                <td>
                  <Platform value={task.platform} />
                </td>
                <td>
                  {task.worker_id ?? <span className="muted">等待租约</span>}
                  {task.lease_expires_at ? (
                    <small className="table-sub">
                      租约至 {formatTime(task.lease_expires_at)}
                    </small>
                  ) : null}
                </td>
                <td>
                  <Status value={task.status} />
                  {task.error_code ? (
                    <small className="table-sub error-text">
                      {task.error_code} · {task.failure_category}
                    </small>
                  ) : null}
                </td>
                <td>
                  {task.model_version ?? "模型未返回"}
                  <small className="table-sub">
                    {responseMode(task.response_mode)} · {task.region}
                  </small>
                </td>
                <td>
                  {task.attempt}/{task.max_attempts}
                </td>
                <td>
                  {task.response_sha256 ? (
                    <code>{task.response_sha256.slice(0, 12)}…</code>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {["failed", "blocked"].includes(task.status) ? (
                    <button
                      className="action-primary"
                      disabled={busy === task.id}
                      onClick={() =>
                        command(
                          { command: "retry_task", taskId: task.id },
                          task.id,
                          "任务已重新排队",
                        )
                      }
                    >
                      重新运行
                    </button>
                  ) : (
                    <button
                      className="row-menu"
                      aria-label={`打开任务 ${task.id.slice(0, 8)} 的更多操作`}
                      disabled
                      title="该任务当前没有可用操作"
                    >
                      •••
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tasks.length ? (
          <div className="empty-state">当前筛选条件下没有真实采集任务</div>
        ) : null}
      </div>
    </section>
  );
}

function Evidence({ data }: { data: AdminData }) {
  const runs = data.tasks.filter((task) => task.status === "parsed");
  const requestIds = runs.filter((task) => task.provider_request_id).length;
  const citationCount = runs.reduce(
    (sum, task) => sum + Number(task.citation_count || 0),
    0,
  );
  return (
    <>
      <section className="evidence-summary">
        <article>
          <span>API</span>
          <div>
            <b>{requestIds} 个请求 ID</b>
            <small>来自三家官方 API</small>
          </div>
        </article>
        <article>
          <span>✓</span>
          <div>
            <b>{runs.length} 次完成运行</b>
            <small>每次运行保留原始回答</small>
          </div>
        </article>
        <article>
          <span>↗</span>
          <div>
            <b>{citationCount} 条引用</b>
            <small>保留服务商返回来源</small>
          </div>
        </article>
        <article>
          <span>#</span>
          <div>
            <b>SHA-256</b>
            <small>抽检时返回原始内容哈希</small>
          </div>
        </article>
      </section>
      <section className="panel evidence-library">
        <div className="table-toolbar">
          <div>
            <h2>官方 API 证据抽检</h2>
            <p>核对请求 ID、模型、搜索模式、Token、回答哈希和引用数量</p>
          </div>
        </div>
        <div className="evidence-admin-grid">
          {runs.map((run) => (
            <article key={run.id}>
              <div className="evidence-admin-head">
                <Platform value={run.platform} mode="api" />
                <span>{responseMode(run.response_mode)}</span>
              </div>
              <h3>{run.project_name}</h3>
              <p>
                {run.answer_text?.slice(0, 180) ||
                  "该运行没有可展示的回答文字。"}
              </p>
              <dl>
                <div>
                  <dt>模型</dt>
                  <dd>{run.model_version ?? "—"}</dd>
                </div>
                <div>
                  <dt>请求 ID</dt>
                  <dd>{run.provider_request_id ?? "—"}</dd>
                </div>
                <div>
                  <dt>时间</dt>
                  <dd>{formatTime(run.completed_at)}</dd>
                </div>
                <div>
                  <dt>Token / 引用</dt>
                  <dd>
                    {run.input_tokens +
                      run.output_tokens +
                      run.reasoning_tokens}{" "}
                    / {run.citation_count}
                  </dd>
                </div>
              </dl>
              <code>{run.response_sha256 ?? "回答哈希未返回"}</code>
              <div className="evidence-admin-actions">
                {run.source_url ? (
                  <a href={run.source_url} target="_blank" rel="noreferrer">
                    官方 API 端点 ↗
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!runs.length ? (
          <div className="empty-state">
            官方 API
            运行成功后，请求元数据会自动进入这里；当前不会生成示例证据。
          </div>
        ) : null}
      </section>
    </>
  );
}

function Exceptions({
  data,
  command,
  busy,
}: {
  data: AdminData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const open = data.events.filter((event) => !Number(event.acknowledged));
  return (
    <>
      <section className="exception-summary">
        <article>
          <span className="severity severity-critical">!</span>
          <div>
            <b>
              {open.filter((event) => event.severity === "critical").length}{" "}
              个紧急异常
            </b>
            <small>验证、阻断或页面结构变化</small>
          </div>
        </article>
        <article>
          <span className="severity severity-warning">!</span>
          <div>
            <b>
              {open.filter((event) => event.severity === "warning").length}{" "}
              个警告
            </b>
            <small>超时、空回答或网络错误</small>
          </div>
        </article>
        <article>
          <span className="severity severity-info">i</span>
          <div>
            <b>
              {data.events.filter((event) => Number(event.acknowledged)).length}{" "}
              个已处理
            </b>
            <small>保留完整发生次数与审计</small>
          </div>
        </article>
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h2>异常事件</h2>
            <p>相同错误已按指纹聚合，避免重复告警淹没运营人员</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>级别</th>
                <th>事件</th>
                <th>平台</th>
                <th>类型</th>
                <th>次数</th>
                <th>最近发生</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <span className={`severity severity-${event.severity}`}>
                      {event.severity === "info" ? "i" : "!"}
                    </span>
                  </td>
                  <td className="event-message">
                    <b>{event.message}</b>
                    <small>
                      {event.task_id
                        ? `关联运行 ${event.task_id}`
                        : "系统级事件"}
                    </small>
                  </td>
                  <td>
                    {event.platform ? (
                      <Platform value={event.platform} />
                    ) : (
                      "系统"
                    )}
                  </td>
                  <td>
                    <span className="soft-code">{event.event_type}</span>
                  </td>
                  <td>{event.occurrence_count}</td>
                  <td>{formatTime(event.created_at)}</td>
                  <td>
                    <Status value={event.status} />
                  </td>
                  <td>
                    <div className="row-actions">
                      {event.status === "open" ? (
                        <button
                          className="action-primary"
                          disabled={busy === event.id}
                          onClick={() =>
                            command(
                              {
                                command: "acknowledge_event",
                                eventId: event.id,
                              },
                              event.id,
                              "异常已确认",
                            )
                          }
                        >
                          确认
                        </button>
                      ) : null}
                      {event.status !== "resolved" ? (
                        <button
                          disabled={busy === event.id}
                          onClick={() =>
                            command(
                              { command: "resolve_alert", eventId: event.id },
                              event.id,
                              "异常已解决",
                            )
                          }
                        >
                          解决
                        </button>
                      ) : (
                        <button
                          disabled={busy === event.id}
                          onClick={() =>
                            command(
                              { command: "reopen_alert", eventId: event.id },
                              event.id,
                              "异常已重新打开",
                            )
                          }
                        >
                          重新打开
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.events.length ? (
            <div className="empty-state">目前没有采集异常</div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function AuditLog({ data }: { data: AdminData }) {
  return (
    <section className="panel audit-panel">
      <div className="table-toolbar">
        <div>
          <h2>管理员与系统操作</h2>
          <p>不可删除的运营审计记录</p>
        </div>
        <button disabled title="审计导出尚未开放">
          ⇩ 导出审计记录
        </button>
      </div>
      <div className="audit-timeline">
        {data.audits.map((audit) => (
          <article key={audit.id}>
            <span>{audit.actor.slice(0, 1)}</span>
            <div className="audit-line" />
            <div>
              <b>{audit.message}</b>
              <p>
                <em>{audit.actor}</em> · {audit.action} · {audit.subject_type}
              </p>
              <small>
                {formatTime(audit.created_at)} · {audit.subject_id}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
