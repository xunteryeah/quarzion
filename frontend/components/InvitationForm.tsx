"use client";

import { FormEvent, useEffect, useState } from "react";

type Invitation = { organizationName: string; email: string; role: string; expiresAt: string; existingAccount: boolean; signedInAsMatching: boolean };

export function InvitationForm({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "邀请无法使用");
      setInvitation(result);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "邀请无法使用"));
  }, [token]);

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    if (!invitation?.existingAccount && form.get("password") !== form.get("confirmPassword")) { setError("两次输入的密码不一致"); setBusy(false); return; }
    try {
      const response = await fetch("/api/auth/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, displayName: form.get("displayName"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "无法接受邀请");
      window.location.assign("/dashboard");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "无法接受邀请"); setBusy(false); }
  }

  return <main className="auth-page invite-page"><section className="auth-panel auth-copy"><a href="/" className="auth-logo"><span className="app-logo" aria-hidden="true"><i /><i /><i /><i /></span><b>Quarzion</b></a><div><small>PRIVATE WORKSPACE</small><h1>你的 GEO 工作空间已经准备好。</h1><p>接受邀请后，只能看到所属公司与获授权的项目。</p></div><footer><span><i /> 一次性安全邀请</span><span>Quarzion</span></footer></section><section className="auth-panel auth-form-panel"><form onSubmit={accept}><small>WORKSPACE INVITATION</small><h2>{invitation ? `加入 ${invitation.organizationName}` : "正在验证邀请"}</h2>{invitation ? <p>{invitation.email} · {invitation.role === "organization_admin" ? "组织管理员" : invitation.role === "viewer" ? "只读访客" : "成员"}</p> : null}{error ? <div className="auth-error" role="alert">{error}</div> : null}{invitation?.existingAccount && !invitation.signedInAsMatching ? <div className="existing-account-note"><b>这个邮箱已有 Quarzion 账号</b><p>请先登录同一邮箱，再返回本邀请链接完成加入。</p><a href={`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`}>前往登录</a></div> : null}{invitation && (!invitation.existingAccount || invitation.signedInAsMatching) ? <>{!invitation.existingAccount ? <><label>姓名<input name="displayName" autoComplete="name" required minLength={2} maxLength={80} /></label><label>设置密码<input name="password" type="password" autoComplete="new-password" required minLength={12} placeholder="至少 12 个字符" /></label><label>确认密码<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} /></label></> : null}<button disabled={busy}>{busy ? "正在加入空间…" : "接受邀请并进入"}</button></> : null}<div className="auth-help">邀请将在指定时间自动失效，且只能使用一次。</div></form></section></main>;
}
