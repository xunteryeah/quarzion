"use client";

import { FormEvent, useState } from "react";
import { MarketingFooter, MarketingNav } from "@/components/MarketingChrome";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "WindCall",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "面向中国 AI 平台的品牌可见度监测、引用溯源与 GEO 效果证明系统。",
};

function AuditForm({ compact = false }: { compact?: boolean }) {
  const [site, setSite] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.assign(
      `/contact${site.trim() ? `?site=${encodeURIComponent(site.trim())}` : ""}`,
    );
  }
  return (
    <form
      className={compact ? "sv2-audit compact" : "sv2-audit"}
      onSubmit={submit}
    >
      <label
        className="sr-only"
        htmlFor={compact ? "audit-bottom" : "audit-top"}
      >
        输入品牌官网
      </label>
      <input
        id={compact ? "audit-bottom" : "audit-top"}
        value={site}
        onChange={(event) => setSite(event.target.value)}
        placeholder="输入你的品牌官网"
        inputMode="url"
      />
      <button type="submit">申请真实数据审计</button>
    </form>
  );
}

function MotionPanel({
  image,
  kind,
}: {
  image: string;
  kind: "hero" | "monitor" | "trends";
}) {
  return (
    <div
      className={`sv2-motion-panel ${kind}`}
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="sv2-browser-dots">
        <i />
        <i />
        <i />
        <span>app.windcall.cn</span>
      </div>
      {kind === "hero" ? (
        <>
          <div className="sv2-hero-console">
            <header>
              <span>AI SEARCH MONITORING</span>
              <b>
                <i /> 产品界面示意
              </b>
            </header>
            <div className="sv2-console-metrics">
              <article>
                <small>品牌提及率</small>
                <strong>—</strong>
                <em>等待真实运行</em>
              </article>
              <article>
                <small>有效回答</small>
                <strong>—</strong>
                <em>不展示模拟数据</em>
              </article>
              <article>
                <small>引用来源</small>
                <strong>—</strong>
                <em>逐条保存证据</em>
              </article>
            </div>
            <div className="sv2-console-chart">
              <span>真实运行后生成趋势</span>
              <div>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <footer>
              <span>
                <i />
                豆包
              </span>
              <b>每项指标可回到原始回答</b>
              <em>证据链</em>
            </footer>
          </div>
          <div className="sv2-console-float">
            <span>三平台范围</span>
            <b>豆包 · 千问 · DeepSeek</b>
            <small>官方 API · 直答与联网模式</small>
          </div>
        </>
      ) : null}
      {kind === "monitor" ? (
        <div className="sv2-glass-dashboard">
          <header>
            <span>Monitoring</span>
            <b>固定研究窗口</b>
          </header>
          <div className="sv2-mini-metrics">
            <span>
              <small>直接回答</small>
              <b>DIRECT</b>
            </span>
            <span>
              <small>联网回答</small>
              <b>SEARCH</b>
            </span>
          </div>
          <div className="sv2-line-chart">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <p>
            <span>千问</span>
            <b>原始回答、引用与请求 ID</b>
            <em>可审计</em>
          </p>
        </div>
      ) : null}
      {kind === "trends" ? (
        <div className="sv2-trend-glass">
          <small>同一提示词的两种模式</small>
          <strong>直接回答 vs. 联网搜索</strong>
          <b>可比较</b>
          <div>
            <span>豆包</span>
            <span>千问</span>
            <span>DeepSeek</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApiPreview() {
  return (
    <div className="sv2-axp-preview">
      <div className="sv2-view-toggle">
        <b>Direct Answer</b>
        <span>Web Search</span>
      </div>
      <div className="sv2-code-plane">
        <span>provider: doubao / qwen / deepseek</span>
        <span>mode: direct / web_search</span>
        <span>evidence: answer / citations / request_id</span>
        <span>integrity: request_hash / response_hash</span>
      </div>
      <div className="sv2-axp-site">
        <header>
          <b>官方 API 监测</b>
          <span>10 PROMPTS　DAILY</span>
        </header>
        <div>
          <small>REAL PROVIDER RESPONSE</small>
          <h3>同一问题，固定模型与模式，持续重复观察。</h3>
          <p>保存完整回答、引用、Token、时延和供应商请求编号。</p>
          <button disabled>等待项目数据</button>
        </div>
      </div>
      <div className="sv2-token-card">
        <span>
          模型配置 <b>6 个</b>
        </span>
        <span>
          有效组合 <b>11 个/提示词</b>
        </span>
        <em>DeepSeek V4 Pro 联网模式不做伪降级</em>
      </div>
    </div>
  );
}

function Testimonial({ light = false }: { light?: boolean }) {
  return (
    <section className={light ? "sv2-testimonial light" : "sv2-testimonial"}>
      <article>
        <strong>100%</strong>
        <p>指标均可回溯到组成它的真实回答</p>
        <span>EVIDENCE STANDARD</span>
      </article>
      <blockquote>
        “不是只给客户一个黑盒分数，而是让提及率、排名和引用都能展开到原始问题、模型、模式和回答。”
        <footer>
          <b>WindCall 监测方法</b>
          <span>产品证据标准 · 非客户背书</span>
        </footer>
        <a href="/guides/ai-search-guide">阅读监测方法</a>
      </blockquote>
    </section>
  );
}

export function MarketingHome() {
  return (
    <main className="marketing-site scrunch-home-v2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingNav />

      <section className="sv2-hero">
        <div className="sv2-grid" />
        <div className="sv2-hero-copy">
          <h1>
            客户不再只看搜索结果——<em>他们会直接问 AI。</em>
          </h1>
          <p>
            WindCall 持续记录品牌在豆包、千问和 DeepSeek
            中的回答、提及与引用，并把每个指标连接到原始证据。
          </p>
          <AuditForm />
          <div className="sv2-audit-notes">
            <span>✓ 使用真实品牌与提示词</span>
            <span>✓ 不展示模拟结果</span>
          </div>
        </div>
        <MotionPanel image="/geo-motion-forest.png" kind="hero" />
      </section>

      <section className="sv2-trust">
        <div>
          <span>适用于品牌团队</span>
          <span>也适用于 GEO 代理商</span>
        </div>
        <div className="sv2-wordmarks">
          <b>消费品牌</b>
          <b>SaaS 团队</b>
          <b>集团市场部</b>
          <b>公关传播</b>
          <b>SEO 团队</b>
          <b>GEO 代理商</b>
          <b>出海品牌</b>
          <b>电商增长</b>
        </div>
      </section>

      <section className="sv2-dark-statement">
        <h2>
          网站访问可能改变。<em>收入增长不必停下。</em>
        </h2>
        <p>
          当 AI Agent
          替人类研究、比较和评估产品时，品牌必须在答案生成之前被发现、理解并推荐。
        </p>
      </section>

      <section className="sv2-axp-section">
        <div className="sv2-section-intro">
          <div>
            <span>OFFICIAL API MONITORING</span>
            <h2>
              不靠猜测。<em>保留每一次真实回答。</em>
            </h2>
          </div>
          <div>
            <p>
              使用三家模型开放平台的官方
              API，分别运行直接回答与原生联网搜索，并保存引用、Token、请求 ID
              和完整响应哈希。
            </p>
            <a href="/platform/monitoring/citations">查看监测方法</a>
          </div>
        </div>
        <ApiPreview />
        <div className="sv2-axp-cards">
          <a href="/platform/ai-visibility">
            <span>01</span>
            <b>Direct Answers</b>
            <p>观察模型在不联网时的固有品牌认知。</p>
          </a>
          <a href="/platform/monitoring/citations">
            <span>02</span>
            <b>Web Search</b>
            <p>记录联网回答引用了哪些文章与域名。</p>
          </a>
          <a href="/platform/monitoring/insights">
            <span>03</span>
            <b>Evidence</b>
            <p>将指标下钻到原始回答、引用和运行元数据。</p>
          </a>
        </div>
      </section>

      <Testimonial />

      <section className="sv2-split-feature monitoring">
        <div className="sv2-feature-copy">
          <span>AI MONITORING & CITATIONS</span>
          <h2>追踪并扩大品牌在 AI 搜索中的存在。</h2>
          <p>
            监测重要问题中的答案份额、位置与语境，找出被引用的权威来源，并持续验证品牌表现。
          </p>
          <a href="/platform/monitoring/citations">探索监测与引用</a>
          <div className="sv2-feature-list">
            <article className="active">
              <b>Prompt monitoring</b>
              <small>查看品牌如何出现在关键问题中。</small>
            </article>
            <article>
              <b>Citations</b>
              <small>发现塑造 AI 答案的网站与页面。</small>
            </article>
            <article>
              <b>Insights</b>
              <small>识别竞争盲区和内容缺口。</small>
            </article>
          </div>
        </div>
        <MotionPanel image="/geo-motion-clouds.png" kind="monitor" />
      </section>

      <section className="sv2-split-feature trends">
        <MotionPanel image="/geo-motion-grass.png" kind="trends" />
        <div className="sv2-feature-copy">
          <span>MODEL &amp; MODE COMPARISON</span>
          <h2>把模型固有认知与联网搜索影响分开。</h2>
          <p>
            同一提示词分别运行直接回答和联网搜索，比较不同模型、模式与平台中的品牌提及和引用差异。
          </p>
          <a href="/platform/monitoring/insights">探索对比洞察</a>
          <div className="sv2-feature-list">
            <article className="active">
              <b>Direct baseline</b>
              <small>记录模型不联网时的基础品牌认知。</small>
            </article>
            <article>
              <b>Search citations</b>
              <small>查看联网回答采用的来源与文章。</small>
            </article>
            <article>
              <b>Repeatable window</b>
              <small>固定提示词、模型和频率形成可复测基线。</small>
            </article>
          </div>
        </div>
      </section>

      <section className="sv2-enterprise">
        <h2>
          从第一天开始，<em>就为企业服务而构建。</em>
        </h2>
        <div>
          <article>
            <span>01</span>
            <h3>Security</h3>
            <ul>
              <li>组织与项目权限隔离</li>
              <li>关键操作审计</li>
              <li>SSO 与细粒度角色</li>
            </ul>
          </article>
          <article>
            <span>02</span>
            <h3>Scale</h3>
            <ul>
              <li>多品牌与多市场</li>
              <li>大规模提示词运行</li>
              <li>API 与数据集成</li>
            </ul>
          </article>
          <article>
            <span>03</span>
            <h3>Services</h3>
            <ul>
              <li>专属实施支持</li>
              <li>白标客户交付</li>
              <li>策略与技术协作</li>
            </ul>
          </article>
        </div>
      </section>

      <Testimonial light />

      <section className="sv2-publications">
        <div className="sv2-publication-feature">
          <span>WINDCALL METHOD</span>
          <strong>WindCall Labs</strong>
          <h3>品牌如何重新思考 AI 时代的搜索与内容</h3>
        </div>
        <div className="sv2-publication-cards">
          <a href="/blog/geo-roi">
            <span>RESEARCH</span>
            <h3>如何证明 GEO 的投入产出，而不是只展示分数</h3>
            <p>将可见度、引用与业务结果连接成可审计的证据链。</p>
            <i>→</i>
          </a>
          <a href="/guides/ai-search-guide">
            <span>METHOD</span>
            <h3>为什么必须同时比较直接回答与联网搜索</h3>
            <p>把模型固有认知和搜索引用影响拆成两条可复测路径。</p>
            <i>→</i>
          </a>
        </div>
      </section>

      <section className="sv2-final-cta">
        <h2>从真实数据开始。</h2>
        <p>提交一个品牌和关注问题，申请三平台官方 API 监测内测。</p>
        <div>
          <AuditForm compact />
          <a href="/contact">联系我们</a>
        </div>
        <div className="sv2-audit-notes">
          <span>✓ 固定研究口径</span>
          <span>✓ 原始证据可追溯</span>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
