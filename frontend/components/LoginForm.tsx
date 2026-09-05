"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "登录失败");
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      window.location.assign(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="auth-panel auth-copy"><a href="/" className="auth-logo"><span className="app-logo" aria-hidden="true"><i /><i /><i /><i /></span><b>WindCall</b></a><div><small>AI VISIBILITY, PROVEN.</small><h1>欢迎回到<br />品牌的 AI 控制台。</h1><p>查看豆包、千问与 DeepSeek 中的真实回答、品牌提及和引用证据。</p></div><footer><span><i /> 数据空间已加密隔离</span><span>© 2026 WindCall</span></footer></section>
    <section className="auth-panel auth-form-panel"><form onSubmit={submit}><small>CLIENT PORTAL</small><h2>登录客户后台</h2><p>使用管理员邀请的公司邮箱登录。</p>{error ? <div className="auth-error" role="alert">{error}</div> : null}<label>工作邮箱<input name="email" type="email" autoComplete="email" required placeholder="name@company.com" /></label><label>密码<input name="password" type="password" autoComplete="current-password" required placeholder="至少 12 个字符" /></label><button disabled={busy}>{busy ? "正在验证…" : "安全登录"}</button><div className="auth-help">首次使用？请打开管理员发送的一次性邀请链接。<a href="mailto:hello@windcall.cn">联系支持</a></div></form></section>
  </main>;
}
