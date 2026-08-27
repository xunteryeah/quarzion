import { MarketingCTA, MarketingFooter, MarketingNav } from "@/components/MarketingChrome";
import { ContactForm } from "@/components/ContactForm";
import { marketingPageMap, type MarketingPage } from "@/lib/marketing-content";

function ProductVisual({ page }: { page: MarketingPage }) {
  const label = page.kicker;
  return <div className={`deep-product-visual theme-${page.theme ?? "cream"}`} aria-label={`${label}产品界面示意`}>
    <div className="deep-browser-bar"><span><i /><i /><i /></span><b>app.quarzion.ai</b></div>
    <div className="deep-product-body">
      <aside><b>Q</b><i /><i /><i /><i /></aside>
      <section>
        <header><div><small>LIVE WORKSPACE</small><strong>{label}</strong></div><span>过去 30 天</span></header>
        <div className="deep-metric-cards"><article><small>品牌提及率</small><b>64.8%</b><em>+12.6%</em></article><article><small>引用来源</small><b>186</b><em>+24</em></article><article><small>平均情绪</small><b>81</b><em>正向</em></article></div>
        <div className="deep-chart"><span /><i /><i /><i /><i /><i /></div>
        <div className="deep-result-row"><span>豆包</span><b>成长型企业 GEO 平台推荐</b><em>#1</em></div>
        <div className="deep-result-row"><span>元宝</span><b>如何证明 GEO 优化效果</b><em>#2</em></div>
      </section>
    </div>
    <article className="deep-float-card"><small>新机会</small><b>12 个高价值提示词</b><span>已生成行动建议</span></article>
  </div>;
}

function Highlights({ page }: { page: MarketingPage }) {
  if (!page.highlights?.length) return null;
  return <div className="deep-highlights">{page.highlights.map((item) => <article key={`${item.value}-${item.label}`}><strong>{item.value}</strong><span>{item.label}</span></article>)}</div>;
}

function RelatedCards({ paths = [] }: { paths?: string[] }) {
  const pages = paths.map((path) => marketingPageMap.get(path)).filter((page): page is MarketingPage => Boolean(page));
  if (!pages.length) return null;
  return <section className="deep-related"><header><span>CONTINUE EXPLORING</span><h2>继续深入</h2></header><div>{pages.map((page) => <a href={`/${page.path}`} key={page.path}><small>{page.kicker}</small><h3>{page.title}{page.emphasis ?? ""}</h3><p>{page.summary}</p><i>查看完整内容 →</i></a>)}</div></section>;
}

function IndexPage({ page }: { page: MarketingPage }) {
  const cards = (page.related ?? []).map((path) => marketingPageMap.get(path)).filter((item): item is MarketingPage => Boolean(item));
  return <>
    <DeepHero page={page} />
    <section className="content-index-grid">{cards.map((item, index) => <a href={`/${item.path}`} key={item.path} className={`index-card theme-${item.theme ?? "cream"}`}><span>{String(index + 1).padStart(2, "0")} · {item.kicker}</span><h2>{item.title}{item.emphasis ? <em>{item.emphasis}</em> : null}</h2><p>{item.summary}</p><i>打开页面 →</i></a>)}</section>
    <MarketingCTA />
  </>;
}

function DeepHero({ page, visual = false }: { page: MarketingPage; visual?: boolean }) {
  return <section className={`deep-hero theme-${page.theme ?? "cream"}`}>
    <div className="deep-grid" aria-hidden="true" />
    <div className="deep-hero-copy"><span>{page.kicker}</span><h1>{page.title}{page.emphasis ? <em>{page.emphasis}</em> : null}</h1><p>{page.summary}</p><div className="deep-hero-actions"><a href="/tools/brand-audit">免费品牌快检</a><a href="/contact">预约演示</a></div>{page.readTime || page.updated ? <div className="article-meta"><span>{page.updated ? `更新于 ${page.updated}` : ""}</span><span>{page.readTime ?? ""}</span></div> : null}</div>
    {visual ? <ProductVisual page={page} /> : <div className="deep-hero-orb" aria-hidden="true"><i /><i /><i /><b>Q</b></div>}
  </section>;
}

function ProductOrSolutionPage({ page }: { page: MarketingPage }) {
  return <>
    <DeepHero page={page} visual />
    <Highlights page={page} />
    <section className="deep-statement"><span>{page.kind === "solution" ? "FROM BASELINE TO BUSINESS" : "BUILT FOR AI SEARCH"}</span><h2>{page.kind === "solution" ? "一套系统连接团队、行动和证明。" : "从看见问题，到知道为什么，再到采取行动。"}</h2></section>
    <div className="deep-feature-list">{page.sections.map((section, index) => <section className="deep-feature-section" key={section.title}><div><span>{section.eyebrow ?? `0${index + 1}`}</span><h2>{section.title}</h2><p>{section.body}</p>{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div><FeatureGlass index={index} title={section.title} /></section>)}</div>
    <section className="deep-method"><header><span>HOW IT WORKS</span><h2>从监测到证明的完整闭环</h2></header><div><article><span>01</span><h3>建立基线</h3><p>固定品牌、平台、提示词和时间窗口。</p></article><article><span>02</span><h3>发现与行动</h3><p>找到技术、内容和第三方来源机会。</p></article><article><span>03</span><h3>复测与证明</h3><p>使用相同条件验证真实变化。</p></article></div></section>
    <RelatedCards paths={page.related} />
    <MarketingCTA />
  </>;
}

function FeatureGlass({ index, title }: { index: number; title: string }) {
  const rows = ["品牌与竞争差距", "高影响引用来源", "目标页面与行动", "观察窗口与证据"];
  return <div className={`feature-glass feature-${index % 4}`}><div className="feature-glow" /><article><header><small>QUARZION · {String(index + 1).padStart(2, "0")}</small><b>{title}</b></header><div className="feature-big-number">{["64.8%", "186", "+24.6%", "81"][index % 4]}</div><div className="feature-bars"><i /><i /><i /><i /></div>{rows.map((row, rowIndex) => <p key={row}><span>{row}</span><b>{["领先", "12 个", "进行中", "已验证"][(rowIndex + index) % 4]}</b></p>)}</article></div>;
}

function EditorialPage({ page }: { page: MarketingPage }) {
  const schema = page.kind === "faq" ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: page.title, acceptedAnswer: { "@type": "Answer", text: page.summary } }] } : { "@context": "https://schema.org", "@type": "Article", headline: page.title, description: page.summary, dateModified: page.updated ?? "2026-08-14" };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <DeepHero page={page} />
    <Highlights page={page} />
    <div className="editorial-shell">
      <aside><span>本页内容</span>{page.sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.title}>{String(index + 1).padStart(2, "0")} {section.title}</a>)}</aside>
      <article className="editorial-content"><p className="editorial-lead">{page.summary}</p>{page.sections.map((section, index) => <section id={`section-${index + 1}`} key={section.title}><span>{section.eyebrow ?? `${String(index + 1).padStart(2, "0")} / ${page.kicker}`}</span><h2>{section.title}</h2>{section.stat ? <div className="editorial-stat"><strong>{section.stat.value}</strong><p>{section.stat.label}</p></div> : null}<p>{section.body}</p>{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</section>)}</article>
    </div>
    <RelatedCards paths={page.related} />
    <MarketingCTA compact />
  </>;
}

function PricingPage({ page }: { page: MarketingPage }) {
  return <>
    <DeepHero page={page} />
    <section className="deep-pricing-grid">{page.sections.map((plan, index) => <article className={index === 2 ? "featured" : ""} key={plan.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{plan.title}</h2><p>{plan.body}</p><strong>{index < 2 ? "按品牌与规模配置" : "定制方案"}</strong>{plan.bullets ? <ul>{plan.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}<a href="/contact">咨询方案 →</a></article>)}</section>
    <section className="pricing-note"><b>说明</b><p>当前页面展示产品方案结构，不构成正式报价。上线前需要确认价格、配额、支持范围、服务等级和超额规则。</p></section>
    <RelatedCards paths={page.related} />
    <MarketingCTA />
  </>;
}

function ToolPage({ page }: { page: MarketingPage }) {
  return <>
    <DeepHero page={page} />
    <section className="tool-workbench"><div><span>FREE GEO TOOL</span><h2>{page.title}</h2><p>{page.summary}</p><form action="/dashboard"><label htmlFor="tool-domain">品牌官网或品牌名称</label><div><input id="tool-domain" name="site" placeholder="例如：yourbrand.cn" required /><button type="submit">开始生成</button></div><small>当前工具会打开演示工作台，不会向第三方提交数据。</small></form></div><ProductVisual page={page} /></section>
    <div className="editorial-shell tool-explain"><aside><span>工具说明</span></aside><article className="editorial-content">{page.sections.map((section, index) => <section key={section.title}><span>0{index + 1}</span><h2>{section.title}</h2><p>{section.body}</p></section>)}</article></div>
    <MarketingCTA compact />
  </>;
}

function StructuredProductPage({ page }: { page: MarketingPage }) {
  const isAxp = page.path === "platform/agent-experience";
  const isMonitoring = page.path === "platform/monitoring/citations";
  const isInsights = page.path === "platform/monitoring/insights";
  const dark = isMonitoring;
  const image = isInsights ? "/geo-motion-grass.png" : isMonitoring ? "/geo-motion-clouds.png" : "/geo-motion-forest.png";
  return <>
    <section className={`sv2-product-hero ${dark ? "dark" : ""}`}><div className="sv2-grid" /><div><span>{page.kicker}</span><h1>{page.title}<em>{page.emphasis}</em></h1><p>{page.summary}</p><div className="sv2-product-actions"><a href="/contact">预约演示</a><a href="/brand-audit">运行品牌快检</a></div></div>{isMonitoring ? <div className="sv2-platform-words"><span>豆包</span><span>腾讯元宝</span><span>DeepSeek</span><span>Kimi</span></div> : null}</section>
    <section className="sv2-product-stage" style={{ backgroundImage: `url(${image})` }}><div className="sv2-stage-browser"><header><i /><i /><i /><span>app.quarzion.ai</span></header>{isAxp ? <div className="sv2-stage-axp"><div><small>HUMAN VIEW</small><b>124,916</b><span>tokens</span></div><em>→</em><div><small>AGENT VIEW</small><b>1,355</b><span>tokens</span></div></div> : <ProductVisual page={page} />}</div></section>
    <section className="sv2-dark-trust"><span>适用于 500+ 品牌与代理商的运行规模</span><div><b>品牌市场部</b><b>SEO 团队</b><b>公关传播</b><b>GEO 代理商</b><b>集团业务线</b><b>电商增长</b></div></section>
    <section className="sv2-product-heading"><h2>{isAxp ? <>你的网站——<em>为 AI Agent 重新组织。</em></> : isMonitoring ? <>知道品牌在哪里出现，<em>以及谁正在塑造答案。</em></> : <>从数据中找到<em>真正值得采取的行动。</em></>}</h2></section>
    <div className="sv2-product-features">{page.sections.map((section, index) => <section key={section.title}><div className="sv2-feature-tabs">{page.sections.map((item, itemIndex) => <span className={index === itemIndex ? "active" : ""} key={item.title}>{item.title}</span>)}</div><div className="sv2-feature-explain"><span>{String(index + 1).padStart(2,"0")}</span><h2>{section.title}</h2><p>{section.body}</p>{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div><FeatureGlass index={index} title={section.title} /></section>)}</div>
    <section className="sv2-deep-proof"><article><strong>{isAxp ? "87%" : "364%"}</strong><p>{isAxp ? "演示页面 Token 减少" : "非品牌问题可见度演示增长"}</p><span>DEMO METHOD</span></article><blockquote>“我们不再只猜测 AI 看见了什么。每一次访问、回答、品牌提及和引用，都可以回到证据。”<small>Quarzion 方法案例 · 非客户背书</small></blockquote></section>
    <MarketingCTA />
  </>;
}

function AudiencePage({ page }: { page: MarketingPage }) {
  const enterprise = page.path === "enterprise";
  return <>
    <section className={`sv2-audience-hero ${enterprise ? "enterprise" : "agency"}`}><div className="sv2-grid" /><div><span>{page.kicker}</span><h1>{page.title}<em>{page.emphasis}</em></h1><p>{page.summary}</p><a href="/contact">{enterprise ? "预约企业演示" : "申请代理商合作"}</a></div><div className="sv2-metal-shapes" aria-hidden="true"><i /><i /><i /><i /></div></section>
    <section className="sv2-audience-intro"><span>{enterprise ? "SECURITY · SCALE · SERVICES" : "PLATFORM · PARTNERSHIP"}</span><h2>{enterprise ? "大型团队需要的治理，快速团队需要的行动速度。" : "按照代理商真实售卖、运营和交付方式构建。"}</h2></section>
    <div className="sv2-audience-sections">{page.sections.map((section,index)=><section key={section.title}><div><span>{String(index+1).padStart(2,"0")}</span><h2>{section.title}</h2><p>{section.body}</p>{section.bullets?<ul>{section.bullets.map(b=><li key={b}>{b}</li>)}</ul>:null}</div><FeatureGlass index={index} title={section.title}/></section>)}</div>
    <section className="sv2-audience-stat"><strong>{enterprise ? "6M+" : "260%+"}</strong><p>{enterprise ? "每周可扩展引用记录（能力示意）" : "代理商新服务收入演示增长"}</p><span>示意指标，正式发布前需替换为真实数据</span></section>
    <MarketingCTA />
  </>;
}

function ContactPage({ page }: { page: MarketingPage }) {
  return <>
    <section className="contact-page-hero"><div className="deep-grid" aria-hidden="true" /><div className="contact-page-copy"><span>{page.kicker}</span><h1>{page.title}<em>{page.emphasis}</em></h1><p>{page.summary}</p><div className="contact-expectations">{page.sections.map((section, index) => <article key={section.title}><small>0{index + 1}</small><div><h2>{section.title}</h2><p>{section.body}</p></div></article>)}</div></div><ContactForm /></section>
  </>;
}

function StructuredPricingPage({ page }: { page: MarketingPage }) {
  return <><section className="sv2-pricing-hero"><div className="sv2-grid"/><h1>与你一起<em>扩展的定价。</em></h1><p>{page.summary}</p><div className="sv2-pricing-toggle"><b>品牌团队</b><span>代理商</span></div></section><section className="sv2-pricing-cards"><article><header><h2>Core</h2><strong>按品牌配置</strong></header><p>适合建立 AI 可见度基线、验证效果并开始规模化的团队。</p><ul>{page.sections[0]?.bullets?.map(item=><li key={item}>{item}</li>)}</ul><a href="/brand-audit">开始免费试用</a></article><article className="dark"><header><h2>Enterprise</h2><strong>定制方案</strong></header><p>适合需要更大模型覆盖、AXP、API、安全与专属服务的企业。</p><ul>{page.sections[3]?.bullets?.map(item=><li key={item}>{item}</li>)}</ul><a href="/contact">联系我们</a></article></section><section className="sv2-pricing-compare"><h2>完整能力比较</h2>{["Monitor","Analyze","Optimize","Workspace","Data Integrations","Security","Support & Services"].map((label,index)=><article key={label}><b>{label}</b><span>{index<4?"包含":"可选"}</span><span>企业级</span></article>)}</section><RelatedCards paths={page.related}/><MarketingCTA/></>;
}

export function DeepMarketingPage({ page }: { page: MarketingPage }) {
  let content;
  if (page.path === "contact") content = <ContactPage page={page} />;
  else if (["platform/agent-experience","platform/monitoring/citations","platform/monitoring/insights"].includes(page.path)) content = <StructuredProductPage page={page} />;
  else if (["enterprise","agencies"].includes(page.path)) content = <AudiencePage page={page} />;
  else if (page.path === "pricing") content = <StructuredPricingPage page={page} />;
  else if (page.kind === "index") content = <IndexPage page={page} />;
  else if (page.kind === "product" || page.kind === "solution") content = <ProductOrSolutionPage page={page} />;
  else if (page.kind === "pricing") content = <PricingPage page={page} />;
  else if (page.kind === "tool") content = <ToolPage page={page} />;
  else content = <EditorialPage page={page} />;
  return <main className="marketing-site deep-site"><MarketingNav />{content}<MarketingFooter /></main>;
}
