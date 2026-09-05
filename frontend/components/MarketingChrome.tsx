"use client";

import { useEffect, useRef, useState } from "react";

const productLinks = [
  [
    "/platform/monitoring/citations",
    "Monitoring & Citations",
    "追踪品牌答案份额与引用来源",
  ],
  ["/platform/monitoring/insights", "Insights", "获得提高 AI 可见度的行动建议"],
  [
    "/platform/ai-visibility",
    "回答证据",
    "查看豆包、千问与 DeepSeek 的原始回答",
  ],
] as const;

const resourceLinks = [
  ["/guides/ai-search-guide", "AI 搜索指南"],
  ["/blog", "GEO 观察"],
  ["/how-tos", "操作指南"],
  ["/faqs", "常见问题"],
] as const;

function Brand() {
  return (
    <a
      className="marketing-brand sv2-brand"
      href="/"
      aria-label="WindCall 首页"
    >
      <img src="/windcall-logo.svg" alt="" />
    </a>
  );
}

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    "product" | "cases" | "resources" | null
  >(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 48);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMenu(null);
    };
    const closeOutside = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node))
        setActiveMenu(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, []);

  const toggleMenu = (menu: "product" | "cases" | "resources") => {
    setActiveMenu((current) => (current === menu ? null : menu));
  };

  const ticker = Array.from({ length: 6 }, (_, index) => (
    <span className="sv2-ticker-message" key={index}>
      AI 搜索的下一章，已经开始。
      <span className="sv2-ticker-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 12h15m-6-6 6 6-6 6" />
        </svg>
      </span>
    </span>
  ));

  return (
    <>
      <a
        className="chapter-strip sv2-strip"
        href="/guides/ai-search-guide"
        aria-label="阅读 WindCall AI 搜索实战指南"
      >
        <span className="sv2-ticker-fade is-left" aria-hidden="true" />
        <span className="sv2-ticker-track" aria-hidden="true">
          <span className="sv2-ticker-group">{ticker}</span>
          <span className="sv2-ticker-group">{ticker}</span>
        </span>
        <span className="sv2-ticker-fade is-right" aria-hidden="true" />
      </a>
      <header
        ref={navRef}
        className={`marketing-nav deep-marketing-nav sv2-nav${scrolled ? " is-scrolled" : ""}`}
        onMouseLeave={() => setActiveMenu(null)}
      >
        <div className="sv2-nav-left">
          <Brand />
          <nav className="mega-navigation sv2-navigation" aria-label="主导航">
            <div
              className={`sv2-nav-item${activeMenu === "product" ? " is-open" : ""}`}
              onMouseEnter={() => setActiveMenu("product")}
            >
              <button
                className="sv2-nav-trigger"
                type="button"
                aria-expanded={activeMenu === "product"}
                aria-controls="product-menu"
                onClick={() => toggleMenu("product")}
                onFocus={() => setActiveMenu("product")}
              >
                产品
                <i aria-hidden="true" />
              </button>
              <div
                className="mega-panel sv2-mega product-mega"
                id="product-menu"
              >
                <div className="product-mega-columns">
                  <section>
                    <span>Monitoring &amp; Evidence</span>
                    {productLinks.map(([href, label, description]) => (
                      <a href={href} key={href}>
                        <b>{label}</b>
                        <small>{description}</small>
                      </a>
                    ))}
                  </section>
                  <section>
                    <span>Workspace</span>
                    <a href="/enterprise">
                      <b>企业工作空间</b>
                      <small>组织、项目、权限与审计隔离</small>
                    </a>
                    <a href="/agencies">
                      <b>代理商工作空间</b>
                      <small>在同一后台管理多个客户项目</small>
                    </a>
                  </section>
                </div>
                <a className="product-mega-trends" href="/contact">
                  <b>申请正式内测</b>
                  <small>接入真实品牌、提示词和每日监测</small>
                </a>
              </div>
            </div>
            <div
              className={`sv2-nav-item${activeMenu === "cases" ? " is-open" : ""}`}
              onMouseEnter={() => setActiveMenu("cases")}
            >
              <button
                className="sv2-nav-trigger"
                type="button"
                aria-expanded={activeMenu === "cases"}
                aria-controls="cases-menu"
                onClick={() => toggleMenu("cases")}
                onFocus={() => setActiveMenu("cases")}
              >
                应用场景
                <i aria-hidden="true" />
              </button>
              <div className="mega-panel sv2-mega cases-mega" id="cases-menu">
                <a href="/enterprise">
                  <span
                    className="sv2-case-image is-enterprise"
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <b>Enterprise</b>
                  <small>面向企业的 AI 可见度、洞察和规模化行动。</small>
                </a>
                <a href="/agencies">
                  <span className="sv2-case-image is-agency" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <b>Agencies</b>
                  <small>帮助客户掌握 AI 优先的用户旅程。</small>
                </a>
              </div>
            </div>
            <div
              className={`sv2-nav-item${activeMenu === "resources" ? " is-open" : ""}`}
              onMouseEnter={() => setActiveMenu("resources")}
            >
              <button
                className="sv2-nav-trigger"
                type="button"
                aria-expanded={activeMenu === "resources"}
                aria-controls="resources-menu"
                onClick={() => toggleMenu("resources")}
                onFocus={() => setActiveMenu("resources")}
              >
                资源
                <i aria-hidden="true" />
              </button>
              <div
                className="mega-panel sv2-mega resources-mega"
                id="resources-menu"
              >
                <section>
                  {resourceLinks.slice(0, 2).map(([href, label]) => (
                    <a href={href} key={href}>
                      <b>{label}</b>
                    </a>
                  ))}
                </section>
                <section>
                  {resourceLinks.slice(2).map(([href, label]) => (
                    <a href={href} key={href}>
                      <b>{label}</b>
                    </a>
                  ))}
                </section>
              </div>
            </div>
            <div className="sv2-nav-item">
              <a className="sv2-nav-link" href="/pricing">
                定价
              </a>
            </div>
          </nav>
        </div>
        <div className="marketing-actions sv2-actions">
          <details className="mobile-nav-menu">
            <summary>
              <span className="sr-only">打开导航菜单</span>
              <span className="sv2-menu-icon" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </summary>
            <div className="mobile-nav-panel">
              <a href="/platform/monitoring/citations">监测与引用</a>
              <a href="/platform/monitoring/insights">Insights</a>
              <a href="/enterprise">企业</a>
              <a href="/agencies">代理商</a>
              <a href="/resources">资源</a>
              <a href="/pricing">定价</a>
              <a href="/contact">申请内测</a>
              <a href="/contact">预约演示</a>
            </div>
          </details>
          <a className="nav-signin" href="/dashboard">
            登录
          </a>
          <a className="nav-trial" href="/contact">
            申请内测
          </a>
          <a className="nav-demo" href="/contact">
            预约演示
          </a>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer deep-footer sv2-footer">
      <div>
        <h3>产品</h3>
        <a href="/platform/monitoring/citations">Monitoring & Citations</a>
        <a href="/platform/monitoring/insights">Insights</a>
        <a href="/platform/ai-visibility">回答证据</a>
        <a href="/pricing">定价</a>
      </div>
      <div>
        <h3>应用场景</h3>
        <a href="/enterprise">Enterprise</a>
        <a href="/agencies">Agencies</a>
      </div>
      <div>
        <h3>资源</h3>
        <a href="/guides/ai-search-guide">AI 搜索指南</a>
        <a href="/blog">GEO 观察</a>
        <a href="/how-tos">操作指南</a>
        <a href="/faqs">常见问题</a>
      </div>
      <div>
        <h3>立即开始</h3>
        <a href="/contact">申请正式内测</a>
        <a href="/contact">预约演示</a>
        <a href="/dashboard">登录工作台</a>
      </div>
      <div className="footer-card sv2-plan-card">
        <span>查看方案</span>
        <b>从品牌团队到代理商，按你的 AI 业务规模扩展。</b>
        <a href="/pricing" aria-label="查看价格与方案">
          →
        </a>
      </div>
      <div className="footer-company">
        <h3>公司</h3>
        <a href="/about">关于我们</a>
        <a href="/contact">联系我们</a>
      </div>
      <div className="footer-logo">
        <Brand />
      </div>
      <div className="footer-bottom">
        <span>© 2026 WindCall</span>
        <a href="/about">服务条款</a>
        <a href="/about">隐私政策</a>
      </div>
    </footer>
  );
}

export function MarketingCTA({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={compact ? "deep-cta compact sv2-cta" : "deep-cta sv2-cta"}
    >
      <div>
        <span>START WITH REAL DATA</span>
        <h2>用一个真实品牌建立 AI 可见度基线。</h2>
        <p>
          提交品牌、竞品与关注问题，我们会为内测项目配置三平台官方 API 监测。
        </p>
      </div>
      <div className="deep-cta-actions">
        <a href="/contact">申请正式内测</a>
        <a href="/contact">联系我们</a>
      </div>
    </section>
  );
}
