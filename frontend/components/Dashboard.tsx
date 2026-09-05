"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  clientName: string;
  region: string;
  language: string;
};
type PlatformStat = {
  platform: string;
  runs: number;
  completionRate: number;
  validAnswers: number;
  mentions: number;
  mentionRate: number;
  topThreeRate: number;
  avgPosition: number | null;
  sentiment: number | null;
};
type BrandStat = {
  id: string;
  name: string;
  canonicalName: string;
  website: string | null;
  isPrimary: boolean;
  answers: number;
  mentionRate: number;
  averagePosition: number | null;
  sentiment: number | null;
  shareOfResponse: number;
  cooccurrenceRate: number | null;
  platforms: string[];
};
type SourceStat = {
  domain: string;
  sourceType: string;
  citations: number;
  answersWithDomain: number;
  domainRate: number;
  primaryAssociatedRate: number;
  primaryAssociatedAnswers: number;
  uniqueUrls: number;
  platforms: string[];
  brandCount: number;
};
type Prompt = {
  id: string;
  queryText: string;
  topic: string;
  intent: string;
  isBranded: number;
  targetPlatforms: string[];
  active: number;
  runs: number;
  completionRate: number;
  validAnswers: number;
  mentions: number;
  mentionRate: number;
  avgPosition: number | null;
};
type Run = {
  id: string;
  promptId: string;
  queryText: string;
  platform: string;
  region: string;
  modelVersion: string | null;
  modelTier: string | null;
  responseMode: string;
  searchPerformed: number;
  providerRequestId: string | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  costMicros: number | null;
  scheduledAt: string;
  status: string;
  attempt: number;
  durationMs: number | null;
  collectorVersion: string;
  rawText: string | null;
  errorMessage: string | null;
  failureCode: string | null;
  failureCategory: string | null;
  sourceUrl: string | null;
  pageTitle: string | null;
  responseSha256: string | null;
  executionMode: string;
  startedAt: string | null;
  completedAt: string | null;
  parsedAt: string | null;
};
type Answer = {
  id: string;
  runId: string;
  promptId: string;
  queryText: string;
  platform: string;
  answerText: string;
  mentionsPrimary: number;
  primaryPosition: number | null;
  sentimentScore: number | null;
  parserVersion: string;
  createdAt: string;
};
type Mention = {
  id: string;
  answerId: string;
  brandId: string;
  brandName: string;
  isPrimary: number;
  position: number;
  mentionCount: number;
  sentimentScore: number;
};
type Citation = {
  id: string;
  answerId: string;
  url: string;
  domain: string;
  title: string;
  sourceType: string;
  mentionsPrimary: number;
  firstSeenAt: string;
};
type Alias = {
  id: string;
  brandId: string;
  brandName: string;
  alias: string;
  status: string;
  detectedCount: number;
  source: string;
  reviewedAt: string | null;
  createdAt: string;
};
type Action = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  owner: string;
  targetPlatforms: string[];
  targetPromptIds: string[];
  publishedUrl: string | null;
  completedAt: string | null;
  createdAt: string;
};
type Evidence = {
  id: string;
  actionId: string;
  phase: string;
  platform: string;
  promptId: string | null;
  answersCount: number;
  mentionRate: number;
  avgPosition: number | null;
  citationCount: number;
  recordedAt: string;
};
type Artifact = {
  id: string;
  runId: string;
  answerId: string | null;
  kind: string;
  mimeType: string;
  sha256: string;
  byteSize: number;
  sourceUrl: string | null;
  capturedAt: string;
};
type Audit = {
  id: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  message: string;
  createdAt: string;
};
type Summary = {
  validAnswers: number;
  mentions: number;
  mentionRate: number;
  topThreeRate: number;
  avgPosition: number | null;
  sentiment: number | null;
  scheduledRuns: number;
  completedRuns: number;
  runCompletionRate: number;
  failedRuns: number;
  shareOfResponse: number;
  citationCoverage: number;
  citations: number;
  pendingAliases: number;
};
type TrendPoint = {
  date: string;
  validAnswers: number;
  mentions: number;
  mentionRate: number;
  topThreeRate: number;
  avgPosition: number | null;
  sentiment: number | null;
};
type DashboardData = {
  projects: Project[];
  selectedProjectId: string;
  generatedAt: string;
  currentUser: {
    id: string;
    email: string;
    displayName: string;
    role: string | null;
  };
  summary: Summary;
  platformStats: PlatformStat[];
  trend: TrendPoint[];
  brandStats: BrandStat[];
  sourceStats: SourceStat[];
  prompts: Prompt[];
  runs: Run[];
  answers: Answer[];
  mentions: Mention[];
  citations: Citation[];
  aliases: Alias[];
  actions: Action[];
  evidence: Evidence[];
  artifacts: Artifact[];
  audit: Audit[];
};

type Page =
  | "overview"
  | "brands"
  | "sources"
  | "answers"
  | "evidence"
  | "actions"
  | "prompts"
  | "knowledge"
  | "settings"
  | "help";
type ReportTab = "summary" | "brands" | "platforms" | "prompts" | "sources";

const navPrimary: Array<{ id: Page; label: string; icon: string }> = [
  { id: "overview", label: "监测报告", icon: "▥" },
  { id: "brands", label: "品牌管理", icon: "☷" },
  { id: "sources", label: "引用溯源", icon: "↗" },
  { id: "answers", label: "应答分析", icon: "…" },
  { id: "evidence", label: "原始证据", icon: "▣" },
  { id: "actions", label: "行动任务", icon: "☑" },
];

const navSecondary: Array<{ id: Page; label: string; icon: string }> = [
  { id: "prompts", label: "提示词库", icon: "♧" },
  { id: "knowledge", label: "知识库", icon: "▣" },
  { id: "settings", label: "设置", icon: "⚙" },
];

const pageTitles: Record<Page, string> = {
  overview: "监测报告",
  brands: "品牌",
  sources: "来源",
  answers: "应答分析",
  evidence: "原始证据",
  actions: "行动任务",
  prompts: "提示词库",
  knowledge: "知识库",
  settings: "项目设置",
  help: "帮助中心",
};

const platformNames: Record<string, string> = {
  deepseek: "DeepSeek",
  doubao: "豆包",
  qwen: "千问",
};
const platformShort: Record<string, string> = {
  deepseek: "深",
  doubao: "豆",
  qwen: "千",
};
const statusNames: Record<string, string> = {
  queued: "排队中",
  running: "采集中",
  parsed: "已完成",
  failed: "失败",
  timeout: "超时",
  blocked: "被拦截",
  planned: "未开始",
  in_progress: "进行中",
  measuring: "观察中",
  done: "已完成",
  approved: "已追踪",
  rejected: "已驳回",
  pending: "待确认",
};

function displayPlatform(platform: string) {
  return platformNames[platform] ?? platform;
}
function displayResponseMode(mode: string | null | undefined) {
  return mode === "web_search" ? "联网搜索" : "直接回答";
}
function displayProject(project: Project) {
  return project.name;
}
function platformTone(platform: string) {
  return platform === "deepseek"
    ? "deepseek"
    : platform === "doubao"
      ? "doubao"
      : "qwen";
}
function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}
function num(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(value % 1 === 0 ? 0 : 2);
}
function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function dateBounds(data: DashboardData) {
  const dates = data.runs
    .map((run) => run.scheduledAt.slice(0, 10))
    .filter(Boolean)
    .sort();
  return { from: dates[0] ?? "", to: dates.at(-1) ?? "" };
}

function PlatformIcons({ platforms }: { platforms: string[] }) {
  return (
    <span className="platform-icons">
      {platforms.map((platform) => (
        <i
          className={platformTone(platform)}
          title={displayPlatform(platform)}
          key={platform}
        >
          {platformShort[platform] ?? platform.slice(0, 1)}
        </i>
      ))}
    </span>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span className={`status-tag status-${value}`}>
      {statusNames[value] ?? value}
    </span>
  );
}

function Empty({ text = "暂无数据" }: { text?: string }) {
  return (
    <div className="empty">
      <span>□</span>
      <p>{text}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="loading">
      <span className="app-logo" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <strong>正在加载监测数据…</strong>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [userMenu, setUserMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(projectId?: string) {
    const response = await fetch(
      `/api/dashboard${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`,
    );
    const next = await response.json();
    if (response.status === 401) {
      window.location.assign("/login?returnTo=/dashboard");
      return;
    }
    if (!response.ok) throw new Error(next.error ?? "数据加载失败");
    setData(next);
  }

  useEffect(() => {
    let current = true;
    fetch("/api/dashboard")
      .then(async (response) => {
        const next = await response.json();
        if (response.status === 401) {
          window.location.assign("/login?returnTo=/dashboard");
          throw new Error("请先登录");
        }
        if (!response.ok) throw new Error(next.error ?? "数据加载失败");
        return next as DashboardData;
      })
      .then((next) => {
        if (current) setData(next);
      })
      .catch((reason) => {
        if (current)
          setError(reason instanceof Error ? reason.message : "数据加载失败");
      });
    return () => {
      current = false;
    };
  }, []);

  async function command(
    payload: Record<string, unknown>,
    token: string,
    success?: string,
  ) {
    if (!data) return;
    setBusy(token);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, projectId: data.selectedProjectId }),
      });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error ?? "操作失败");
      setData(next);
      if (success) {
        setToast(success);
        window.setTimeout(() => setToast(null), 2600);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  if (!data && !error) return <Loading />;
  if (!data)
    return (
      <div className="fatal">
        <strong>暂时无法加载项目</strong>
        <p>{error}</p>
        <button onClick={() => load().catch(() => undefined)}>重新连接</button>
      </div>
    );
  if (!data.projects.length) return <EmptyWorkspace />;

  const project =
    data.projects.find((item) => item.id === data.selectedProjectId) ??
    data.projects[0];

  return (
    <div className="product-shell">
      <header className="global-header">
        <button
          className="brand-home"
          onClick={() => setPage("overview")}
          aria-label="WindCall 首页"
        >
          <span className="app-logo" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <b>WindCall</b>
        </button>
        <div className="header-right">
          <span className="header-signal">
            <i /> SYSTEM ONLINE
          </span>
          <button className="language-button" disabled title="当前仅提供中文">
            <span>ZH</span>
            <b>中文</b>
          </button>
          <button
            className="user-button"
            onClick={() => setUserMenu(!userMenu)}
            aria-expanded={userMenu}
            aria-label="打开用户菜单"
          >
            <span>{data.currentUser.displayName.slice(0, 1)}</span>
          </button>
        </div>
        {userMenu ? (
          <div className="user-popover">
            <small>用户</small>
            <strong>{data.currentUser.displayName}</strong>
            <small>{data.currentUser.email}</small>
            <small>组织</small>
            <strong>{project.clientName}</strong>
            <hr />
            <button
              onClick={() => {
                setPage("settings");
                setUserMenu(false);
              }}
            >
              用户设置
            </button>
            <button onClick={logout}>退出登录</button>
          </div>
        ) : null}
      </header>

      <aside className="left-pane">
        <label className="project-select">
          <span className="project-spark">✣</span>
          <select
            value={data.selectedProjectId}
            onChange={(event) =>
              load(event.target.value).catch((reason) =>
                setError(String(reason)),
              )
            }
          >
            {data.projects.map((item) => (
              <option value={item.id} key={item.id}>
                {displayProject(item)}
              </option>
            ))}
          </select>
        </label>
        <nav>
          {navPrimary.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={page === item.id}
              onClick={() => setPage(item.id)}
            />
          ))}
          <div className="nav-divider">
            <button aria-label="菜单已展开" disabled>
              ☷
            </button>
          </div>
          {navSecondary.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={page === item.id}
              onClick={() => setPage(item.id)}
            />
          ))}
          <div className="resource-label">资源</div>
          <NavButton
            item={{ id: "help", label: "帮助中心", icon: "▤" }}
            active={page === "help"}
            onClick={() => setPage("help")}
          />
        </nav>
        <div className="own-feature">
          <span>证</span>
          <p>
            <strong>我们的特色</strong>
            <small>原始证据 · 可审计 · 可证明</small>
          </p>
        </div>
      </aside>

      <main className={`page-view page-${page}`}>
        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        ) : null}
        <h1>{pageTitles[page]}</h1>
        {page === "overview" ? <ReportPage data={data} /> : null}
        {page === "brands" ? (
          <BrandsPage data={data} command={command} busy={busy} />
        ) : null}
        {page === "sources" ? <SourcesPage data={data} /> : null}
        {page === "answers" ? <AnswersPage data={data} /> : null}
        {page === "evidence" ? <EvidencePage data={data} /> : null}
        {page === "actions" ? (
          <ActionsPage data={data} command={command} busy={busy} />
        ) : null}
        {page === "prompts" ? (
          <PromptsPage data={data} command={command} busy={busy} />
        ) : null}
        {page === "knowledge" ? (
          <KnowledgePage
            data={data}
            notify={(message) => {
              setToast(message);
              window.setTimeout(() => setToast(null), 2600);
            }}
          />
        ) : null}
        {page === "settings" ? (
          <SettingsPage data={data} command={command} busy={busy} />
        ) : null}
        {page === "help" ? <HelpPage /> : null}
      </main>
      {toast ? <div className="toast">✓ {toast}</div> : null}
    </div>
  );
}

function EmptyWorkspace() {
  return (
    <div className="empty-workspace">
      <header>
        <span className="app-logo" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <b>WindCall</b>
        <em>
          <i /> SYSTEM ONLINE
        </em>
      </header>
      <main>
        <span className="empty-orbit" aria-hidden="true">
          ✣
        </span>
        <small>YOUR WORKSPACE IS READY</small>
        <h1>项目空间已经准备好。</h1>
        <p>
          当前正式数据库没有演示项目或虚构趋势。管理员创建客户公司、项目并发送邀请后，真实监测内容会显示在这里。
        </p>
        <div>
          <span>1</span>管理员创建客户组织 <i>→</i>
          <span>2</span>创建项目与主品牌 <i>→</i>
          <span>3</span>邀请客户进入
        </div>
      </main>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: Page; label: string; icon: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "nav-button active" : "nav-button"}
      onClick={onClick}
    >
      <i>{item.icon}</i>
      <span>{item.label}</span>
    </button>
  );
}

function FilterBar({
  data,
  platform,
  setPlatform,
  allowPlatform = true,
}: {
  data: DashboardData;
  platform: string;
  setPlatform: (value: string) => void;
  allowPlatform?: boolean;
}) {
  const dates = dateBounds(data);
  return (
    <div className="filter-bar">
      <span className="date-range">
        数据范围：{dates.from || "尚无数据"}{" "}
        {dates.to && dates.to !== dates.from ? `→ ${dates.to}` : ""}
      </span>
      {allowPlatform ? (
        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          aria-label="平台"
        >
          <option value="all">全部平台</option>
          {data.platformStats.map((item) => (
            <option value={item.platform} key={item.platform}>
              {displayPlatform(item.platform)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function ReportPage({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<ReportTab>("summary");
  const answers = data.answers;
  const firstRate = answers.length
    ? (answers.filter((answer) => answer.primaryPosition === 1).length /
        answers.length) *
      100
    : 0;
  const tabs: Array<[ReportTab, string]> = [
    ["summary", "总览"],
    ["brands", "品牌对比"],
    ["platforms", "平台"],
    ["prompts", "提示词"],
    ["sources", "引用来源"],
  ];
  return (
    <>
      <section className="signal-hero" aria-labelledby="signal-hero-title">
        <div className="cosmic-field" aria-hidden="true">
          <i />
          <i />
          <i />
          <span />
        </div>
        <div className="signal-hero-copy">
          <span className="signal-eyebrow">
            <i /> GEO INTELLIGENCE ·{" "}
            {data.runs.some((run) => run.status === "running")
              ? "LIVE"
              : "READY"}
          </span>
          <h2 id="signal-hero-title">
            让 AI 看见你，<span>并留下证据。</span>
          </h2>
          <p>
            持续监测
            DeepSeek、豆包与千问中的品牌可见度，把每一次回答、提及和引用变成可以追溯的增长证据。
          </p>
          <div className="signal-meta">
            <span>
              <i />
              {data.runs.length ? "监测数据已连接" : "等待首次采集"}
            </span>
            <span>更新于 {formatTime(data.generatedAt)}</span>
          </div>
        </div>
        <div className="proof-stack" aria-label="实时监测摘要">
          <article className="proof-card proof-card-main">
            <header>
              <span>VISIBILITY SIGNAL</span>
              <b>{data.answers.length ? "MEASURED" : "NO DATA"}</b>
            </header>
            <strong>
              {data.answers.length ? data.summary.mentionRate.toFixed(1) : "—"}
              <small>{data.answers.length ? "%" : ""}</small>
            </strong>
            <p>主品牌真实提及率</p>
            <div className="signal-graph" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </article>
          <article className="proof-card proof-card-answer">
            <span>已验证回答</span>
            <strong>{data.summary.validAnswers}</strong>
            <small>原始应答可追溯</small>
          </article>
          <article className="proof-card proof-card-citation">
            <span>引用证据</span>
            <strong>{data.summary.citations}</strong>
            <small>{pct(data.summary.citationCoverage)} 覆盖率</small>
          </article>
        </div>
      </section>
      <section className="report-controls">
        <div className="control-kicker">
          <span>RESEARCH WINDOW</span>
          <small>当前数据库中的完整真实样本</small>
        </div>
        <FilterBar
          data={data}
          platform="all"
          setPlatform={() => undefined}
          allowPlatform={false}
        />
      </section>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "summary" ? (
        <>
          <section className="metric-grid">
            <Metric
              label="回答总数"
              value={String(answers.length)}
              hint="有效回答，不含失败运行"
            />
            <Metric
              label="提及率"
              value={pct(data.summary.mentionRate)}
              hint="提及主品牌的回答占比"
            />
            <Metric
              label="前三提及率"
              value={pct(data.summary.topThreeRate)}
              hint="提及后进入前三的比例"
            />
            <Metric
              label="首位率"
              value={pct(firstRate)}
              hint="主品牌首次出现即排首位"
            />
            <Metric
              label="平均排名"
              value={num(data.summary.avgPosition)}
              hint="仅统计已提及回答"
            />
            <Metric
              label="平均情绪指数"
              value={`${num(data.summary.sentiment)} / 100`}
              hint="品牌上下文的正负向指数"
            />
            <Metric
              label="平均 SOR"
              value={pct(data.summary.shareOfResponse)}
              hint="主品牌回答声量份额"
            />
            <Metric
              label="引用覆盖率"
              value={pct(data.summary.citationCoverage)}
              hint="包含至少一条真实引用的回答占比"
            />
          </section>
          <TrendChart metric="提及率" points={data.trend} />
        </>
      ) : null}
      {tab === "brands" ? <BrandComparison data={data} /> : null}
      {tab === "platforms" ? <PlatformReport data={data} /> : null}
      {tab === "prompts" ? <PromptReport data={data} /> : null}
      {tab === "sources" ? <SourceReport data={data} /> : null}
    </>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="metric-card">
      <span>
        {label} <i title={hint}>?</i>
      </span>
      <strong>{value}</strong>
    </article>
  );
}

function TrendChart({
  metric,
  points,
}: {
  metric: string;
  points: TrendPoint[];
}) {
  if (points.length < 2)
    return (
      <section className="chart-section">
        <div className="section-head">
          <h3>趋势（随时间）</h3>
          <span>{metric}</span>
        </div>
        <Empty text="至少完成两个不同日期的真实采集后，才会生成趋势线" />
      </section>
    );
  const values = points.map((point) => point.mentionRate);
  const lower = Math.max(0, Math.min(...values) - 5);
  const upper = Math.min(100, Math.max(...values) + 5);
  const span = Math.max(1, upper - lower);
  const coordinates = points.map((point, index) => ({
    x: (index / (points.length - 1)) * 1000,
    y: 270 - ((point.mentionRate - lower) / span) * 250,
  }));
  const path = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const middle = points[Math.floor((points.length - 1) / 2)];
  return (
    <section className="chart-section">
      <div className="section-head">
        <h3>趋势（随时间）</h3>
        <span>{metric}</span>
      </div>
      <div className="trend-chart">
        <div className="chart-axis">
          <span>{Math.round(upper)}%</span>
          <span>{Math.round((upper + lower) / 2)}%</span>
          <span>{Math.round(lower)}%</span>
        </div>
        <div className="line-canvas">
          <svg
            viewBox="0 0 1000 280"
            preserveAspectRatio="none"
            aria-label={`${metric}真实趋势`}
          >
            <polyline points={path} />
            <g>
              {coordinates.map((point, index) => (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  key={points[index].date}
                />
              ))}
            </g>
          </svg>
          <span className="chart-date left">{points[0].date}</span>
          <span className="chart-date center">{middle.date}</span>
          <span className="chart-date right">{points.at(-1)?.date}</span>
        </div>
      </div>
    </section>
  );
}

function BrandComparison({ data }: { data: DashboardData }) {
  return (
    <section className="report-section">
      <h2>品牌对比</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>品牌</th>
              <th>提及次数 ↓</th>
              <th>提及率 ↓</th>
              <th>均位 ↓</th>
              <th>均情感 ↓</th>
              <th>平均 SOR ↓</th>
              <th>与主品牌共现率 ↓</th>
            </tr>
          </thead>
          <tbody>
            {data.brandStats.map((brand) => (
              <tr key={brand.id}>
                <td>
                  <BrandCell brand={brand} />
                </td>
                <td>
                  <b>{brand.answers}</b>
                </td>
                <td>{pct(brand.mentionRate)}</td>
                <td>{num(brand.averagePosition)}</td>
                <td>
                  <Sentiment value={brand.sentiment} />
                </td>
                <td>{pct(brand.shareOfResponse)}</td>
                <td>{pct(brand.cooccurrenceRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TrendChart metric="主品牌提及率" points={data.trend} />
    </section>
  );
}

function PlatformReport({ data }: { data: DashboardData }) {
  return (
    <section className="report-section">
      <h2>平台表现</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>平台</th>
              <th>回答数</th>
              <th>完成率</th>
              <th>提及次数</th>
              <th>提及率</th>
              <th>前三提及率</th>
              <th>平均排名</th>
              <th>平均情绪</th>
            </tr>
          </thead>
          <tbody>
            {data.platformStats.map((item) => (
              <tr key={item.platform}>
                <td>
                  <span className="platform-name">
                    <PlatformIcons platforms={[item.platform]} />
                    <b>{displayPlatform(item.platform)}</b>
                  </span>
                </td>
                <td>{item.validAnswers}</td>
                <td>{pct(item.completionRate)}</td>
                <td>{item.mentions}</td>
                <td>{pct(item.mentionRate)}</td>
                <td>{pct(item.topThreeRate)}</td>
                <td>{num(item.avgPosition)}</td>
                <td>
                  <Sentiment value={item.sentiment} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PromptReport({ data }: { data: DashboardData }) {
  return (
    <section className="report-section">
      <h2>提示词表现</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>提示词</th>
              <th>主题</th>
              <th>平台</th>
              <th>回答数</th>
              <th>提及率</th>
              <th>平均排名</th>
              <th>完成率</th>
            </tr>
          </thead>
          <tbody>
            {data.prompts.map((prompt) => (
              <tr key={prompt.id}>
                <td className="long-cell">
                  <b>{prompt.queryText}</b>
                </td>
                <td>
                  <span className="soft-tag">{prompt.topic}</span>
                </td>
                <td>
                  <PlatformIcons platforms={prompt.targetPlatforms} />
                </td>
                <td>{prompt.validAnswers}</td>
                <td>{pct(prompt.mentionRate)}</td>
                <td>{num(prompt.avgPosition)}</td>
                <td>{pct(prompt.completionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SourceReport({ data }: { data: DashboardData }) {
  return (
    <section className="report-section">
      <h2>引用来源</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>域名</th>
              <th>引用次数</th>
              <th>回答覆盖</th>
              <th>域名占比</th>
              <th>提及主品牌</th>
              <th>关联率</th>
            </tr>
          </thead>
          <tbody>
            {data.sourceStats.slice(0, 12).map((source) => (
              <tr key={source.domain}>
                <td>
                  <DomainCell source={source} />
                </td>
                <td>
                  <b>{source.citations}</b>
                </td>
                <td>{source.answersWithDomain}</td>
                <td>{pct(source.domainRate)}</td>
                <td>{source.primaryAssociatedAnswers}</td>
                <td>{pct(source.primaryAssociatedRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BrandsPage({
  data,
  command,
  busy,
}: {
  data: DashboardData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success?: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const [tab, setTab] = useState("tracked");
  const [brandEditor, setBrandEditor] = useState<{
    id?: string;
    name: string;
    canonicalName: string;
    website: string;
  } | null>(null);
  const recent = data.aliases
    .filter((alias) => alias.status === "approved")
    .slice(0, 3);
  const pending = data.aliases.filter((alias) => alias.status === "pending");
  return (
    <>
      <section className="auto-classify">
        <div className="auto-head">
          <h3>自动归类</h3>
          <span>近 24 小时 {recent.length + pending.length} 条</span>
          <button onClick={() => setTab("discovered")}>查看全部 →</button>
        </div>
        {recent.map((alias) => (
          <div className="classify-row" key={alias.id}>
            <span className="classify-icon">◎</span>
            <p>
              <b>{alias.alias}</b>
              <small>
                归入 <strong>{alias.brandName}</strong>
              </small>
            </p>
            <span className="tracked-tag">已追踪</span>
            <time>{formatTime(alias.reviewedAt)}</time>
            <button
              className="link-button"
              disabled
              title="别名撤销接口尚未开放"
            >
              撤销
            </button>
          </div>
        ))}
      </section>
      <div className="tabs brand-tabs">
        <button
          className={tab === "tracked" ? "active" : ""}
          onClick={() => setTab("tracked")}
        >
          监测品牌
        </button>
        <button
          className={tab === "manage" ? "active" : ""}
          onClick={() => setTab("manage")}
        >
          品牌管理
        </button>
        <button
          className={tab === "discovered" ? "active" : ""}
          onClick={() => setTab("discovered")}
        >
          发现（{pending.length}）
        </button>
      </div>
      {tab === "tracked" ? (
        <section className="content-card">
          <div className="intro-strip">
            <span>▥</span>
            <p>
              <b>一览你正在追踪的品牌</b>
              <small>品牌在全部真实样本中的提及、排名、情感与共现。</small>
            </p>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>品牌 ↕</th>
                  <th>提及次数 ↕</th>
                  <th>实际出现平台</th>
                  <th>平均排名 ↕</th>
                  <th>平均情绪指数 ↕</th>
                  <th>与主品牌共现率 % ↕</th>
                </tr>
              </thead>
              <tbody>
                {data.brandStats.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <BrandCell
                        brand={brand}
                        aliases={data.aliases.filter(
                          (alias) => alias.brandId === brand.id,
                        )}
                      />
                    </td>
                    <td>
                      <b>{brand.answers}</b>
                    </td>
                    <td>
                      {brand.platforms.length ? (
                        <PlatformIcons platforms={brand.platforms} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{num(brand.averagePosition)}</td>
                    <td>
                      <Sentiment value={brand.sentiment} />
                    </td>
                    <td>{pct(brand.cooccurrenceRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {tab === "manage" ? (
        <section className="content-card">
          <div className="card-toolbar">
            <div>
              <h3>品牌管理</h3>
              <p>维护规范名称、别名和官网，保证实体识别准确。</p>
            </div>
            <button
              className="primary-button"
              disabled={busy === "brand:create"}
              onClick={() =>
                setBrandEditor({ name: "", canonicalName: "", website: "" })
              }
            >
              + 添加品牌
            </button>
          </div>
          {brandEditor ? (
            <form
              className="brand-editor"
              onSubmit={async (event) => {
                event.preventDefault();
                const token = brandEditor.id
                  ? `brand:${brandEditor.id}`
                  : "brand:create";
                await command(
                  {
                    command: brandEditor.id ? "update_brand" : "create_brand",
                    brandId: brandEditor.id,
                    name: brandEditor.name,
                    canonicalName: brandEditor.canonicalName || brandEditor.name,
                    website: brandEditor.website,
                  },
                  token,
                  brandEditor.id ? "品牌资料已更新" : "品牌已添加",
                );
                setBrandEditor(null);
              }}
            >
              <label>
                <span>品牌显示名称</span>
                <input
                  required
                  maxLength={120}
                  value={brandEditor.name}
                  onChange={(event) =>
                    setBrandEditor({ ...brandEditor, name: event.target.value })
                  }
                  placeholder="例如：劳力士"
                />
              </label>
              <label>
                <span>规范名称</span>
                <input
                  required
                  maxLength={120}
                  value={brandEditor.canonicalName}
                  onChange={(event) =>
                    setBrandEditor({
                      ...brandEditor,
                      canonicalName: event.target.value,
                    })
                  }
                  placeholder="用于去重和实体识别"
                />
              </label>
              <label>
                <span>官方网站（可选）</span>
                <input
                  type="url"
                  value={brandEditor.website}
                  onChange={(event) =>
                    setBrandEditor({ ...brandEditor, website: event.target.value })
                  }
                  placeholder="https://example.com"
                />
              </label>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setBrandEditor(null)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busy === (brandEditor.id ? `brand:${brandEditor.id}` : "brand:create")}
                >
                  {brandEditor.id ? "保存修改" : "确认添加"}
                </button>
              </div>
            </form>
          ) : null}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>品牌</th>
                  <th>规范名称</th>
                  <th>别名</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.brandStats.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <BrandCell brand={brand} />
                    </td>
                    <td>{brand.canonicalName}</td>
                    <td>
                      <span className="alias-list">
                        {data.aliases
                          .filter(
                            (alias) =>
                              alias.brandId === brand.id &&
                              alias.status === "approved",
                          )
                          .map((alias) => (
                            <i key={alias.id}>{alias.alias}</i>
                          ))}
                      </span>
                    </td>
                    <td>
                      {brand.isPrimary ? (
                        <span className="primary-brand-tag">主品牌</span>
                      ) : (
                        "竞品"
                      )}
                    </td>
                    <td>
                      <Status value="approved" />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        disabled={busy === `brand:${brand.id}`}
                        onClick={() =>
                          setBrandEditor({
                            id: brand.id,
                            name: brand.name,
                            canonicalName: brand.canonicalName,
                            website: brand.website ?? "",
                          })
                        }
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {tab === "discovered" ? (
        <section className="content-card">
          <div className="card-toolbar">
            <div>
              <h3>发现的品牌与别名</h3>
              <p>确认后从后续回答开始参与识别；驳回项不会污染指标。</p>
            </div>
          </div>
          {pending.length ? (
            <div className="discovery-list">
              {pending.map((alias) => (
                <div className="discovery-row" key={alias.id}>
                  <span className="brand-avatar">
                    {alias.alias.slice(0, 1)}
                  </span>
                  <p>
                    <b>{alias.alias}</b>
                    <small>
                      可能属于 {alias.brandName} · 在 {alias.detectedCount}{" "}
                      条回答中发现
                    </small>
                  </p>
                  <button
                    disabled={busy === alias.id}
                    onClick={() =>
                      command(
                        {
                          command: "review_alias",
                          aliasId: alias.id,
                          status: "rejected",
                        },
                        alias.id,
                        "候选已驳回",
                      )
                    }
                  >
                    驳回
                  </button>
                  <button
                    className="primary-button"
                    disabled={busy === alias.id}
                    onClick={() =>
                      command(
                        {
                          command: "review_alias",
                          aliasId: alias.id,
                          status: "approved",
                        },
                        alias.id,
                        "别名已确认，将从后续回答开始参与识别",
                      )
                    }
                  >
                    确认归属
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="没有待确认候选" />
          )}
        </section>
      ) : null}
    </>
  );
}

function BrandCell({
  brand,
  aliases = [],
}: {
  brand: BrandStat;
  aliases?: Alias[];
}) {
  return (
    <span className="brand-cell">
      <i className={brand.isPrimary ? "primary" : ""}>
        {brand.name.slice(0, 1)}
      </i>
      <span>
        <b>
          {brand.name}
          {brand.isPrimary ? <em>★</em> : null}
        </b>
        {aliases.length ? (
          <small>
            {aliases.slice(0, 3).map((alias) => (
              <u key={alias.id}>{alias.alias}</u>
            ))}
            {aliases.length > 3 ? ` +${aliases.length - 3} 更多` : ""}
          </small>
        ) : null}
      </span>
    </span>
  );
}

function Sentiment({ value }: { value: number | null }) {
  return (
    <span className="sentiment">
      <b>{num(value)}</b>
      <i>
        <u style={{ width: `${value ?? 0}%` }} />
      </i>
    </span>
  );
}

function SourcesPage({ data }: { data: DashboardData }) {
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const sources = data.sourceStats.filter(
    (source) =>
      (platform === "all" || source.platforms.includes(platform)) &&
      source.domain.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <FilterBar data={data} platform={platform} setPlatform={setPlatform} />
      <section className="content-card source-card">
        <div className="card-toolbar">
          <h3>引用来源（{sources.length}）</h3>
          <label className="search-box">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索域名..."
            />
            <span>⌕</span>
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>域名 ↕</th>
                <th>引用次数 ↕</th>
                <th>唯一链接数 ↕</th>
                <th>域名占比 ↕</th>
                <th>实际引用平台</th>
                <th>关联品牌</th>
                <th>提及主品牌</th>
                <th>关联率</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.domain}>
                  <td>
                    <DomainCell source={source} />
                  </td>
                  <td>
                    <b>{source.citations}</b>
                  </td>
                  <td>{source.uniqueUrls}</td>
                  <td>{pct(source.domainRate)}</td>
                  <td>
                    {source.platforms.length ? (
                      <PlatformIcons platforms={source.platforms} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{source.brandCount} 个品牌</td>
                  <td>{source.primaryAssociatedAnswers}</td>
                  <td>{pct(source.primaryAssociatedRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={sources.length} label="来源" />
      </section>
    </>
  );
}

function DomainCell({ source }: { source: SourceStat }) {
  return (
    <span className="domain-cell">
      <i>{source.domain.slice(0, 1).toUpperCase()}</i>
      <span>
        <b>{source.domain}</b>
        <small>{source.sourceType}</small>
      </span>
    </span>
  );
}

function AnswersPage({ data }: { data: DashboardData }) {
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Answer | null>(null);
  const answers = data.answers.filter(
    (answer) =>
      (platform === "all" || answer.platform === platform) &&
      `${answer.queryText} ${answer.answerText}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function exportCsv() {
    const rows = [
      ["时间", "平台", "提示词", "回答", "是否提及", "引用数"],
      ...answers.map((answer) => [
        answer.createdAt,
        displayPlatform(answer.platform),
        answer.queryText,
        answer.answerText,
        answer.mentionsPrimary ? "是" : "否",
        String(
          data.citations.filter((citation) => citation.answerId === answer.id)
            .length,
        ),
      ]),
    ];
    const blob = new Blob(
      [
        rows
          .map((row) =>
            row
              .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
              .join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "geo-answers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <FilterBar data={data} platform={platform} setPlatform={setPlatform} />
      <section className="content-card">
        <div className="card-toolbar">
          <h3>应答列表（{answers.length}）</h3>
          <div className="toolbar-actions">
            <button className="secondary-button" onClick={exportCsv}>
              ⇩ 导出 CSV
            </button>
            <label className="search-box">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索提示词或回答..."
              />
              <span>⌕</span>
            </label>
          </div>
        </div>
        <div className="table-scroll">
          <table className="answers-table">
            <thead>
              <tr>
                <th>时间 ↕</th>
                <th>平台</th>
                <th>提示词</th>
                <th>回答</th>
                <th>品牌 ↕</th>
                <th>提及您 ↕</th>
                <th>引用 ↕</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((answer) => {
                const answerMentions = data.mentions.filter(
                  (mention) => mention.answerId === answer.id,
                );
                const answerCitations = data.citations.filter(
                  (citation) => citation.answerId === answer.id,
                );
                return (
                  <tr key={answer.id}>
                    <td>{formatTime(answer.createdAt)}</td>
                    <td>
                      <PlatformIcons platforms={[answer.platform]} />
                    </td>
                    <td className="prompt-cell">{answer.queryText}</td>
                    <td className="answer-cell">
                      <button
                        onClick={() => setSelected(answer)}
                        title="点击预览"
                      >
                        {answer.answerText}
                      </button>
                    </td>
                    <td>{answerMentions.length} 个品牌</td>
                    <td>
                      {answer.mentionsPrimary ? (
                        <span className="mention-yes">
                          ✓ 第 {answer.primaryPosition} 位
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{answerCitations.length} 个引用</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={answers.length} label="回答" />
      </section>
      {selected ? (
        <AnswerDrawer
          answer={selected}
          data={data}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function AnswerDrawer({
  answer,
  data,
  onClose,
}: {
  answer: Answer;
  data: DashboardData;
  onClose: () => void;
}) {
  const mentions = data.mentions.filter(
    (mention) => mention.answerId === answer.id,
  );
  const citations = data.citations.filter(
    (citation) => citation.answerId === answer.id,
  );
  const run = data.runs.find((item) => item.id === answer.runId);
  const screenshot = data.artifacts.find(
    (artifact) =>
      artifact.runId === answer.runId && artifact.kind === "screenshot",
  );
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="answer-drawer">
        <header>
          <div>
            <PlatformIcons platforms={[answer.platform]} />
            <b>{displayPlatform(answer.platform)}</b>
            <small>
              {formatTime(answer.createdAt)} · {answer.parserVersion}
            </small>
          </div>
          <button aria-label="关闭回答详情" onClick={onClose}>
            ×
          </button>
        </header>
        <h2>{answer.queryText}</h2>
        <div className="proof-badges">
          <span>原始运行 {answer.runId}</span>
          <span>{run?.region ?? "地区未记录"}</span>
          <span>
            {run?.executionMode === "official_api" ? "官方 API" : "历史采集"}
          </span>
          <span>{displayResponseMode(run?.responseMode)}</span>
          {run?.responseMode === "web_search" ? (
            <span>{run.searchPerformed ? "已执行搜索" : "未触发搜索"}</span>
          ) : null}
          <span>
            {run?.modelTier === "flagship"
              ? "主旗舰"
              : run?.modelTier === "secondary"
                ? "次旗舰"
                : "模型档位未记录"}
          </span>
          <span>{run?.modelVersion ?? "模型版本未返回"}</span>
          <span>{run?.collectorVersion ?? "采集器版本未记录"}</span>
          {run?.providerRequestId ? (
            <span>请求 ID {run.providerRequestId}</span>
          ) : null}
          {run ? (
            <span>
              Token {run.inputTokens + run.outputTokens + run.reasoningTokens}
            </span>
          ) : null}
          {run?.durationMs != null ? (
            <span>耗时 {run.durationMs} ms</span>
          ) : null}
          <span>
            {run?.costMicros != null
              ? `成本 ¥${(run.costMicros / 1_000_000).toFixed(6)}`
              : "费用规则未配置"}
          </span>
          <span>
            {answer.mentionsPrimary
              ? `主品牌第 ${answer.primaryPosition} 位`
              : "未提及主品牌"}
          </span>
          <span>{citations.length} 条引用</span>
        </div>
        {run?.responseSha256 ? (
          <div className="proof-hash">
            <b>回答 SHA-256</b>
            <code>{run.responseSha256}</code>
          </div>
        ) : null}
        {screenshot ? (
          <section>
            <h3>旧版网页采集截图</h3>
            <a
              className="evidence-preview"
              href={`/api/evidence/${screenshot.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={`/api/evidence/${screenshot.id}`}
                alt={`${displayPlatform(answer.platform)} 历史回答页面截图`}
                loading="lazy"
              />
              <span>
                打开历史截图 · {Math.round(screenshot.byteSize / 1024)} KB
              </span>
            </a>
          </section>
        ) : null}
        <section>
          <h3>原始回答</h3>
          <p className="raw-text">{answer.answerText}</p>
        </section>
        <section>
          <h3>识别品牌</h3>
          <div className="drawer-entities">
            {mentions.map((mention) => (
              <span key={mention.id}>
                <i>{mention.position}</i>
                {mention.brandName}
                <small>情绪 {mention.sentimentScore}</small>
              </span>
            ))}
          </div>
        </section>
        <section>
          <h3>引用证据</h3>
          {citations.length ? (
            citations.map((citation) => (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="drawer-citation"
                key={citation.id}
              >
                <i>{citation.domain.slice(0, 1).toUpperCase()}</i>
                <span>
                  <b>{citation.title}</b>
                  <small>
                    {citation.domain} · {citation.sourceType}
                  </small>
                </span>
                <em>↗</em>
              </a>
            ))
          ) : (
            <Empty text="该回答未返回引用" />
          )}
        </section>
      </aside>
    </div>
  );
}

function EvidencePage({ data }: { data: DashboardData }) {
  const [platform, setPlatform] = useState("all");
  const rows = data.runs.filter(
    (run) =>
      run.status === "parsed" &&
      (platform === "all" || run.platform === platform),
  );
  return (
    <>
      <FilterBar data={data} platform={platform} setPlatform={setPlatform} />
      <section className="proof-library-head">
        <article>
          <span>真实回答</span>
          <strong>{data.answers.length}</strong>
          <small>全部来自已完成运行</small>
        </article>
        <article>
          <span>API 请求凭证</span>
          <strong>{rows.filter((run) => run.providerRequestId).length}</strong>
          <small>保留服务商请求 ID</small>
        </article>
        <article>
          <span>引用链接</span>
          <strong>{data.citations.length}</strong>
          <small>保留原始 URL</small>
        </article>
        <article>
          <span>内容哈希</span>
          <strong>{rows.filter((run) => run.responseSha256).length}</strong>
          <small>SHA-256 完整性证明</small>
        </article>
      </section>
      <section className="content-card">
        <div className="card-toolbar">
          <div>
            <h3>原始证据库（{rows.length}）</h3>
            <p>指标 → 原始回答 → 引用链接 → API 请求元数据，逐层可追溯。</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>采集时间</th>
                <th>平台</th>
                <th>提示词</th>
                <th>模型 / 模式</th>
                <th>请求 ID</th>
                <th>引用</th>
                <th>Token</th>
                <th>回答哈希</th>
                <th>API 端点</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => {
                const answer = data.answers.find(
                  (item) => item.runId === run.id,
                );
                const citationCount = answer
                  ? data.citations.filter(
                      (citation) => citation.answerId === answer.id,
                    ).length
                  : 0;
                return (
                  <tr key={run.id}>
                    <td>
                      {formatTime(
                        run.completedAt ?? run.parsedAt ?? run.scheduledAt,
                      )}
                    </td>
                    <td>
                      <PlatformIcons platforms={[run.platform]} />
                    </td>
                    <td className="prompt-cell">
                      <b>{run.queryText}</b>
                      <small>{run.id}</small>
                    </td>
                    <td>
                      {run.modelVersion ?? "模型版本未返回"}
                      <small className="table-sub">
                        {displayResponseMode(run.responseMode)} · {run.region}
                      </small>
                    </td>
                    <td>
                      {run.providerRequestId ? (
                        <code title={run.providerRequestId}>
                          {run.providerRequestId.slice(0, 18)}…
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{citationCount}</td>
                    <td>
                      {run.inputTokens + run.outputTokens + run.reasoningTokens}
                    </td>
                    <td>
                      {run.responseSha256 ? (
                        <code title={run.responseSha256}>
                          {run.responseSha256.slice(0, 16)}…
                        </code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {run.sourceUrl ? (
                        <a
                          className="link-button"
                          href={run.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          官方端点 ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? (
            <Empty text="尚无真实采集证据；不会显示模拟数据" />
          ) : null}
        </div>
      </section>
    </>
  );
}

function Pagination({ total, label }: { total: number; label: string }) {
  return (
    <div className="pagination">
      <span>
        共 {total} 个{label} · 当前一次显示全部
      </span>
    </div>
  );
}

function ActionsPage({
  data,
  command,
  busy,
}: {
  data: DashboardData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success?: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const [tab, setTab] = useState("actions");
  const [showForm, setShowForm] = useState(false);
  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await command(
      {
        command: "create_action",
        title: form.get("title"),
        description: form.get("description"),
        owner: form.get("owner"),
        priority: form.get("priority"),
        targetPlatforms: ["doubao", "qwen", "deepseek"],
        targetPromptIds: [],
      },
      "new-action",
      "行动任务已创建",
    );
    setShowForm(false);
  }
  return (
    <>
      <section className="action-intro">
        <h3>从行动到影响</h3>
        <p>
          使用「行动」来规划并执行优化工作并发布内容。「影响」用于衡量这些已发布
          URL 在不同提示词与平台中的被引用情况和表现。
        </p>
      </section>
      <div className="tabs icon-tabs">
        <button
          className={tab === "actions" ? "active" : ""}
          onClick={() => setTab("actions")}
        >
          ☑ 行动
        </button>
        <button
          className={tab === "impact" ? "active" : ""}
          onClick={() => setTab("impact")}
        >
          ▥ 影响
        </button>
      </div>
      {tab === "actions" ? (
        <section className="content-card">
          <div className="card-toolbar">
            <div className="inline-filters">
              <select>
                <option>全部状态</option>
              </select>
              <select>
                <option>全部优先级</option>
              </select>
              <select>
                <option>全部负责人</option>
              </select>
            </div>
            <div className="toolbar-actions">
              <button
                className="primary-button"
                onClick={() => setShowForm(!showForm)}
              >
                + 新建行动
              </button>
              <button
                className="secondary-button"
                disabled
                title="AI 建议尚未开放"
              >
                ♧ AI 建议
              </button>
              <button
                className="secondary-button"
                disabled
                title="批量导入尚未开放"
              >
                ⇧ 批量导入
              </button>
            </div>
          </div>
          {showForm ? (
            <form className="action-create-form" onSubmit={createAction}>
              <input name="title" required placeholder="行动标题" />
              <input
                name="description"
                required
                placeholder="要优化的内容与渠道"
              />
              <input name="owner" required placeholder="负责人" />
              <select name="priority">
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
              <button
                className="primary-button"
                disabled={busy === "new-action"}
              >
                创建
              </button>
            </form>
          ) : null}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>行动</th>
                  <th>状态</th>
                  <th>优先级 ↕</th>
                  <th>截止日期 ↕</th>
                  <th>负责人</th>
                  <th>内容</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.actions.map((action) => (
                  <tr key={action.id}>
                    <td className="long-cell">
                      <b>{action.title}</b>
                      <small>{action.description}</small>
                    </td>
                    <td>
                      <Status value={action.status} />
                    </td>
                    <td>
                      <span className={`priority priority-${action.priority}`}>
                        {action.priority === "high"
                          ? "高"
                          : action.priority === "medium"
                            ? "中"
                            : "低"}
                      </span>
                    </td>
                    <td>
                      {action.completedAt
                        ? formatTime(action.completedAt)
                        : "—"}
                    </td>
                    <td>{action.owner}</td>
                    <td>
                      {action.publishedUrl ? (
                        <a
                          href={action.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          已发布 URL ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        className="link-button"
                        disabled={busy === action.id}
                        onClick={() =>
                          command(
                            {
                              command: "update_action",
                              actionId: action.id,
                              status:
                                action.status === "planned"
                                  ? "in_progress"
                                  : action.status === "in_progress"
                                    ? "measuring"
                                    : "done",
                            },
                            action.id,
                            "行动状态已更新",
                          )
                        }
                      >
                        推进
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <ImpactView data={data} />
      )}
    </>
  );
}

function ImpactView({ data }: { data: DashboardData }) {
  const proofActions = data.actions.filter((action) =>
    data.evidence.some((evidence) => evidence.actionId === action.id),
  );
  if (!proofActions.length)
    return (
      <section className="content-card">
        <Empty text="发布行动后，这里会显示前后影响" />
      </section>
    );
  return (
    <section className="content-card">
      <div className="card-toolbar">
        <div>
          <h3>已发布内容的影响</h3>
          <p>使用相同平台与提示词，在发布前后窗口按回答量加权计算。</p>
        </div>
        <span className="evidence-standard">我们的特色 · 可审计证据</span>
      </div>
      {proofActions.map((action) => {
        const evidence = data.evidence.filter(
          (item) => item.actionId === action.id,
        );
        const before = evidence.filter((item) => item.phase === "baseline");
        const after = evidence.filter((item) => item.phase === "post");
        const averageRate = (items: Evidence[]) => {
          const count = items.reduce((sum, item) => sum + item.answersCount, 0);
          return count
            ? items.reduce(
                (sum, item) => sum + item.mentionRate * item.answersCount,
                0,
              ) / count
            : 0;
        };
        const beforeRate = averageRate(before),
          afterRate = averageRate(after);
        return (
          <article className="impact-row" key={action.id}>
            <div className="impact-action">
              <Status value={action.status} />
              <b>{action.title}</b>
              <small>{action.publishedUrl ?? "未记录 URL"}</small>
            </div>
            <div>
              <span>优化前</span>
              <b>{pct(beforeRate)}</b>
              <small>
                {before.reduce((sum, item) => sum + item.answersCount, 0)}{" "}
                个回答
              </small>
            </div>
            <div className="impact-arrow">→</div>
            <div>
              <span>优化后</span>
              <b>{pct(afterRate)}</b>
              <small>
                {after.reduce((sum, item) => sum + item.answersCount, 0)} 个回答
              </small>
            </div>
            <div className="impact-delta">
              <span>影响</span>
              <b>+{(afterRate - beforeRate).toFixed(1)} pp</b>
              <small>
                {after.reduce((sum, item) => sum + item.citationCount, 0)}{" "}
                次引用
              </small>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function PromptsPage({
  data,
  command,
  busy,
}: {
  data: DashboardData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success?: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const prompts = data.prompts.filter((prompt) =>
    prompt.queryText.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = useMemo(
    () => [...new Set(prompts.map((prompt) => prompt.topic))],
    [prompts],
  );
  async function createPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await command(
      {
        command: "create_prompt",
        queryText: form.get("queryText"),
        intent: form.get("intent"),
        targetPlatforms: ["doubao", "qwen", "deepseek"],
      },
      "new-prompt",
      "提示词已添加",
    );
    setShowForm(false);
  }
  return (
    <>
      <div className="prompt-header">
        <span>
          启用提示词：<b>{data.prompts.length}/10</b>
        </span>
        <div>
          <button
            className="secondary-button"
            disabled
            title="主题管理接口正在接入"
          >
            + 添加主题
          </button>
          <button
            className="secondary-button"
            disabled
            title="批量导入接口正在接入"
          >
            ⇧ 导入提示词
          </button>
          <button
            className="primary-button"
            disabled={!data.prompts.length || busy === "queue-batch"}
            onClick={() =>
              command(
                { command: "queue_batch" },
                "queue-batch",
                "今日官方 API 监测任务已进入队列",
              )
            }
          >
            {busy === "queue-batch" ? "正在排队…" : "运行今日监测"}
          </button>
        </div>
      </div>
      <section className="content-card">
        <div className="prompt-filters">
          <label className="prompt-search">
            快速搜索
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="按提示词文本筛选"
            />
          </label>
        </div>
        {showForm ? (
          <form className="prompt-create" onSubmit={createPrompt}>
            <input name="queryText" required placeholder="输入新的监测问题" />
            <select name="intent">
              <option>购买推荐</option>
              <option>品类探索</option>
              <option>竞品对比</option>
            </select>
            <button className="primary-button" disabled={busy === "new-prompt"}>
              保存提示词
            </button>
          </form>
        ) : null}
        <div className="prompt-table-head">
          <span>主题 / 提示词</span>
          <span>平台</span>
          <span>回答数</span>
          <span>提及率</span>
          <span />
        </div>
        {groups.length ? (
          groups.map((group) => {
            const groupPrompts = prompts.filter(
              (prompt) => prompt.topic === group,
            );
            const count = groupPrompts.reduce(
              (sum, prompt) => sum + prompt.validAnswers,
              0,
            );
            const rate = groupPrompts.length
              ? groupPrompts.reduce(
                  (sum, prompt) => sum + prompt.mentionRate,
                  0,
                ) / groupPrompts.length
              : 0;
            return (
              <div className="prompt-group" key={group}>
                <div className="prompt-group-row">
                  <span>
                    <i>›</i>
                    <b>{group}</b>
                    <small>- {groupPrompts.length} 条提示词</small>
                  </span>
                  <span>—</span>
                  <b>{count}</b>
                  <b>{pct(rate)}</b>
                  <span />
                </div>
                {groupPrompts.map((prompt) => (
                  <div className="prompt-row" key={prompt.id}>
                    <span>{prompt.queryText}</span>
                    <PlatformIcons platforms={prompt.targetPlatforms} />
                    <b>{prompt.validAnswers}</b>
                    <b>{pct(prompt.mentionRate)}</b>
                    <span />
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          <Empty text="尚未添加监测提示词" />
        )}
        <div className="prompt-footer">
          <button
            className="primary-button"
            onClick={() => setShowForm(!showForm)}
          >
            + 添加提示词
          </button>
          <button
            className="secondary-button"
            disabled
            title="AI 辅助生成尚未开放"
          >
            辅助生成提示词
          </button>
        </div>
      </section>
    </>
  );
}

function KnowledgePage({
  data,
}: {
  data: DashboardData;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState("docs");
  const project = data.projects.find(
    (item) => item.id === data.selectedProjectId,
  );
  return (
    <>
      <p className="page-description">
        知识库存储与你品牌相关的信息——包括产品、服务和核心品牌信息。这些信息将用于推荐最值得监测的提示词与主题，并确保生成的
        GEO 内容保持事实准确且符合品牌调性。
      </p>
      <div className="tabs">
        <button
          className={tab === "docs" ? "active" : ""}
          onClick={() => setTab("docs")}
        >
          文档
        </button>
        <button
          className={tab === "brand" ? "active" : ""}
          onClick={() => setTab("brand")}
        >
          品牌信息
        </button>
      </div>
      {tab === "docs" ? (
        <div className="knowledge-layout">
          <aside>
            <b>{project?.name}</b>
            <div className="storage-bar">
              <span style={{ width: "0%" }} />
            </div>
            <small>当前没有已入库文档</small>
            <button className="active">▣ 全部文档</button>
          </aside>
          <section className="content-card">
            <div className="card-toolbar">
              <div>
                <h3>文档 · 0 文件</h3>
                <p>知识库上传与解析将在正式存储服务接通后开放。</p>
              </div>
              <button className="primary-button" disabled>
                + 添加文档
              </button>
            </div>
            <Empty text="尚未上传真实品牌资料" />
          </section>
        </div>
      ) : (
        <section className="content-card brand-info">
          <div className="card-toolbar">
            <div>
              <h3>品牌核心信息</h3>
              <p>当前没有已保存的品牌事实。正式字段接入前不会显示示例内容。</p>
            </div>
          </div>
          <Empty text="尚未录入品牌定位、产品事实与品牌语调" />
        </section>
      )}
    </>
  );
}

function SettingsPage({
  data,
  command,
  busy,
}: {
  data: DashboardData;
  command: (
    payload: Record<string, unknown>,
    token: string,
    success?: string,
  ) => Promise<void>;
  busy: string | null;
}) {
  const project =
    data.projects.find((item) => item.id === data.selectedProjectId) ??
    data.projects[0];
  const primary = data.brandStats.find((brand) => brand.isPrimary);
  const aliases = data.aliases.filter(
    (alias) => alias.brandId === primary?.id && alias.status === "approved",
  );
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await command(
      {
        command: "update_project",
        name: form.get("projectName"),
        brandName: form.get("brandName"),
        website: form.get("website"),
        region: form.get("region"),
        language: form.get("language"),
      },
      "settings",
      "项目设置已保存",
    );
  }
  return (
    <form className="settings-form" onSubmit={save}>
      <section>
        <h3>{project.name}</h3>
        <label>
          项目名称
          <input name="projectName" defaultValue={project.name} />
        </label>
      </section>
      <hr />
      <section>
        <h3>主品牌</h3>
        <div className="settings-grid">
          <label>
            规范名称
            <input
              name="brandName"
              defaultValue={primary?.name}
              placeholder="输入品牌规范名称"
            />
          </label>
          <label>
            已审核别名
            <div className="tag-input">
              {aliases.length ? (
                aliases.map((alias) => (
                  <span key={alias.id}>{alias.alias}</span>
                ))
              ) : (
                <small>暂无已审核别名</small>
              )}
            </div>
          </label>
          <label>
            官网地址
            <input
              name="website"
              defaultValue={primary?.website ?? ""}
              placeholder="https://品牌官网"
            />
          </label>
        </div>
      </section>
      <hr />
      <section>
        <h3>地区与语言</h3>
        <p>设置该项目面向的市场与结果语言。</p>
        <div className="settings-grid">
          <label>
            默认地区
            <select name="region" defaultValue={project.region}>
              <option value="CN">中国</option>
              <option value="HK">中国香港</option>
              <option value="US">美国</option>
            </select>
          </label>
          <label>
            内容语言
            <select name="language" defaultValue={project.language}>
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </section>
      <hr />
      <section>
        <h3>平台</h3>
        <p>当前版本固定使用三家官方 API。</p>
        <div className="platform-checks">
          <label>
            <input type="checkbox" checked readOnly /> 豆包
          </label>
          <label>
            <input type="checkbox" checked readOnly /> 千问
          </label>
          <label>
            <input type="checkbox" checked readOnly /> DeepSeek
          </label>
        </div>
        <small className="selection-note">固定启用：3/3</small>
      </section>
      <button
        className="primary-button save-settings"
        disabled={busy === "settings"}
      >
        {busy === "settings" ? "保存中…" : "保存更改"}
      </button>
    </form>
  );
}

function HelpPage() {
  return (
    <>
      <p className="page-description">
        从监测口径到客户交付，快速理解这套 GEO 工作流。
      </p>
      <section className="help-grid">
        <article>
          <span>01</span>
          <h3>建立提示词监测面</h3>
          <p>把客户真实购买问题按主题和意图组织，并选择需要追踪的平台。</p>
        </article>
        <article>
          <span>02</span>
          <h3>查看回答与引用</h3>
          <p>监测报告负责汇总，应答分析与引用溯源负责提供可复核证据。</p>
        </article>
        <article>
          <span>03</span>
          <h3>创建优化行动</h3>
          <p>把内容、媒体、百科和官网改造记录成行动，并保存发布 URL。</p>
        </article>
        <article>
          <span>04</span>
          <h3>证明前后影响</h3>
          <p>使用相同问题集、平台和样本口径，比较发布前后的提及与引用变化。</p>
        </article>
      </section>
    </>
  );
}
