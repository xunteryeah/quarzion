"use client";

import { FormEvent, useState } from "react";
import { MarketingFooter, MarketingNav } from "@/components/MarketingChrome";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Quarzion",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "面向中国 AI 平台的 Agent Experience、品牌可见度监测、引用溯源与 GEO 效果证明系统。",
};

function AuditForm({ compact = false }: { compact?: boolean }) {
  const [site, setSite] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.assign(`/dashboard${site.trim() ? `?site=${encodeURIComponent(site.trim())}` : ""}`);
  }
  return <form className={compact ? "sv2-audit compact" : "sv2-audit"} onSubmit={submit}><label className="sr-only" htmlFor={compact ? "audit-bottom" : "audit-top"}>输入品牌官网</label><input id={compact ? "audit-bottom" : "audit-top"} value={site} onChange={(event) => setSite(event.target.value)} placeholder="输入你的品牌官网" inputMode="url" /><button type="submit">运行 AI 可见度检测</button></form>;
}

function MotionPanel({ image, kind }: { image: string; kind: "hero" | "monitor" | "trends" }) {
  return <div className={`sv2-motion-panel ${kind}`} style={{ backgroundImage: `url(${image})` }}>
    <div className="sv2-browser-dots"><i /><i /><i /><span>app.quarzion.ai</span></div>
    {kind === "hero" ? <><div className="sv2-hero-console"><header><span>AI SEARCH MONITORING</span><b><i /> 实时运行</b></header><div className="sv2-console-metrics"><article><small>AI 可见度</small><strong>72.6%</strong><em>+12.4%</em></article><article><small>品牌提及</small><strong>1,256</strong><em>+18.7%</em></article><article><small>引用来源</small><strong>320</strong><em>+15.3%</em></article></div><div className="sv2-console-chart"><span>AI 可见度趋势</span><div><i /><i /><i /><i /><i /><i /><i /></div></div><footer><span><i />豆包</span><b>品牌进入第一推荐位</b><em>证据已保存</em></footer></div><div className="sv2-console-float"><span>最新证据</span><b>腾讯元宝已引用品牌官网</b><small>2 分钟前 · 可追溯原始回答</small></div></> : null}
    {kind === "monitor" ? <div className="sv2-glass-dashboard"><header><span>Monitoring</span><b>过去 12 周</b></header><div className="sv2-mini-metrics"><span><small>回答份额</small><b>64.8%</b></span><span><small>引用来源</small><b>186</b></span></div><div className="sv2-line-chart"><i /><i /><i /><i /><i /></div><p><span>豆包</span><b>品牌进入第一推荐位</b><em>+18%</em></p></div> : null}
    {kind === "trends" ? <div className="sv2-trend-glass"><small>增长最快的主题</small><strong>如何证明 GEO 效果</strong><b>+182%</b><div><span>豆包</span><span>元宝</span><span>DeepSeek</span></div></div> : null}
  </div>;
}

function AxpPreview() {
  return <div className="sv2-axp-preview">
    <div className="sv2-view-toggle"><b>Human View</b><span>AI View</span></div>
    <div className="sv2-code-plane"><span>&lt;main&gt;</span><span>&lt;h1&gt;面向企业的 AI 搜索监测&lt;/h1&gt;</span><span>&lt;p&gt;持续追踪豆包、元宝和 DeepSeek&lt;/p&gt;</span><span>&lt;section&gt;产品事实与服务边界&lt;/section&gt;</span></div>
    <div className="sv2-axp-site"><header><b>示例品牌</b><span>PRODUCTS　ABOUT　CONTACT</span></header><div><small>AI READY PAGE</small><h3>让品牌事实更容易被 AI 理解。</h3><p>清晰定义产品、适用人群、服务边界和证据来源。</p><button>查看产品</button></div></div>
    <div className="sv2-token-card"><span>Human experience <b>123,916 tokens</b></span><span>Agent experience <b>1,355 tokens</b></span><em>Token difference　-122,561</em></div>
  </div>;
}

function Testimonial({ light = false }: { light?: boolean }) {
  return <section className={light ? "sv2-testimonial light" : "sv2-testimonial"}><article><strong>{light ? "4×" : "364%"}</strong><p>{light ? "高意图主题覆盖提升（演示）" : "非品牌问题可见度提升（演示）"}</p><span>DEMO CASE</span></article><blockquote>“过去我们只能展示做了哪些内容。现在每一次品牌提及、引用变化和优化结果，都能回到原始回答验证。”<footer><b>消费品牌增长团队</b><span>方法案例 · 非真实客户背书</span></footer><a href="/case-studies/consumer-brand">阅读方法案例</a></blockquote></section>;
}

export function MarketingHome() {
  return <main className="marketing-site scrunch-home-v2">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <MarketingNav />

    <section className="sv2-hero">
      <div className="sv2-grid" />
      <div className="sv2-hero-copy"><h1>客户不再只访问你的网站——<em>AI 会。</em></h1><p>Quarzion 让网站做好被 AI 访问、理解和引用的准备，让品牌进入答案、获得引用并连接增长。</p><AuditForm /><div className="sv2-audit-notes"><span>✓ 30 秒查看样例结果</span><span>✓ 无需信用卡</span></div></div>
      <MotionPanel image="/geo-motion-forest.png" kind="hero" />
    </section>

    <section className="sv2-trust"><div><span>适用于品牌团队</span><span>也适用于 GEO 代理商</span></div><div className="sv2-wordmarks"><b>消费品牌</b><b>SaaS 团队</b><b>集团市场部</b><b>公关传播</b><b>SEO 团队</b><b>GEO 代理商</b><b>出海品牌</b><b>电商增长</b></div></section>

    <section className="sv2-dark-statement"><h2>网站访问可能改变。<em>收入增长不必停下。</em></h2><p>当 AI Agent 替人类研究、比较和评估产品时，品牌必须在答案生成之前被发现、理解并推荐。</p></section>

    <section className="sv2-axp-section"><div className="sv2-section-intro"><div><span>AXP</span><h2>你的网站还没有为 AI 构建。<em>现在可以了。</em></h2></div><div><p>Agent Experience Platform 在边缘层识别 AI Agent，并交付结构更清晰、Token 更轻的内容，而不影响人类访客。</p><a href="/platform/agent-experience">探索 AXP</a></div></div><AxpPreview /><div className="sv2-axp-cards"><a href="/platform/agent-traffic"><span>↔</span><b>Agent Traffic</b><p>按 AI 平台、页面和 Agent 类型追踪访问。</p></a><a href="/platform/site-maps"><span>▦</span><b>Site Maps</b><p>知道 AI 如何查看网站，以及应该修复什么。</p></a><a href="/platform/agent-experience"><span>↗</span><b>AI Delivery</b><p>无需改动 CMS，交付 Token 更轻的页面。</p></a></div></section>

    <Testimonial />

    <section className="sv2-split-feature monitoring"><div className="sv2-feature-copy"><span>AI MONITORING & CITATIONS</span><h2>追踪并扩大品牌在 AI 搜索中的存在。</h2><p>监测重要问题中的答案份额、位置与语境，找出被引用的权威来源，并持续验证品牌表现。</p><a href="/platform/monitoring/citations">探索监测与引用</a><div className="sv2-feature-list"><article className="active"><b>Prompt monitoring</b><small>查看品牌如何出现在关键问题中。</small></article><article><b>Citations</b><small>发现塑造 AI 答案的网站与页面。</small></article><article><b>Insights</b><small>识别竞争盲区和内容缺口。</small></article></div></div><MotionPanel image="/geo-motion-clouds.png" kind="monitor" /></section>

    <section className="sv2-split-feature trends"><MotionPanel image="/geo-motion-grass.png" kind="trends" /><div className="sv2-feature-copy"><span>AI SEARCH TRENDS</span><h2>看见数百万用户正在向 AI 询问什么。</h2><p>追踪主题趋势、估算问题规模，并比较品牌在高价值主题中的存在率。</p><a href="/platform/ai-search-trends">探索 AI 搜索趋势</a><div className="sv2-feature-list"><article className="active"><b>Track trends</b><small>观察需求正在增长还是衰减。</small></article><article><b>Discover topics</b><small>发现相关主题和隐藏机会。</small></article><article><b>Benchmark topic share</b><small>比较品牌在重要主题中的答案份额。</small></article></div></div></section>

    <section className="sv2-enterprise"><h2>从第一天开始，<em>就为企业服务而构建。</em></h2><div><article><span>01</span><h3>Security</h3><ul><li>组织与项目权限隔离</li><li>关键操作审计</li><li>SSO 与细粒度角色</li></ul></article><article><span>02</span><h3>Scale</h3><ul><li>多品牌与多市场</li><li>大规模提示词运行</li><li>API 与数据集成</li></ul></article><article><span>03</span><h3>Services</h3><ul><li>专属实施支持</li><li>白标客户交付</li><li>策略与技术协作</li></ul></article></div></section>

    <Testimonial light />

    <section className="sv2-publications"><div className="sv2-publication-feature"><span>AS FEATURED IN</span><strong>Quarzion Labs</strong><h3>品牌如何重新思考 AI 时代的搜索与内容</h3></div><div className="sv2-publication-cards"><a href="/blog/geo-roi"><span>RESEARCH</span><h3>如何证明 GEO 的投入产出，而不是只展示分数</h3><p>将可见度、引用与业务结果连接成可审计的归因链。</p><i>→</i></a><a href="/blog/account-pool-operations"><span>OPERATIONS</span><h3>豆包与元宝号池运营的五个关键控制点</h3><p>健康度、冷却、任务队列、异常隔离与审计。</p><i>→</i></a></div></section>

    <section className="sv2-final-cta"><h2>几秒钟开始。</h2><p>为品牌运行一次 AI 可见度检测，或者预约完整产品演示。</p><div><AuditForm compact /><a href="/contact">联系我们</a></div><div className="sv2-audit-notes"><span>✓ 30 秒查看样例结果</span><span>✓ 无需信用卡</span></div></section>
    <MarketingFooter />
  </main>;
}
