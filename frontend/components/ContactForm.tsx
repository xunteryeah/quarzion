"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, consent: values.consent === "on" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "提交失败，请稍后再试");
      setReference(result.reference ?? "");
      setState("sent");
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败，请稍后再试");
      setState("idle");
    }
  }

  if (state === "sent") return <section className="contact-success" role="status"><span>✓</span><h2>我们已经收到。</h2><p>团队会根据你留下的工作邮箱联系你。</p>{reference ? <small>提交编号 {reference}</small> : null}<button onClick={() => setState("idle")}>提交另一条需求</button></section>;

  return <form className="contact-form" onSubmit={submit} noValidate>
    <div className="contact-form-head"><small>BOOK A PRODUCT WALKTHROUGH</small><h2>预约产品演示</h2><p>告诉我们你的品牌和现在最想解决的问题。</p></div>
    <div className="contact-fields">
      <label>姓名<input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="你的姓名" /></label>
      <label>公司<input name="company" autoComplete="organization" required minLength={2} maxLength={120} placeholder="公司或品牌名称" /></label>
      <label>工作邮箱<input name="email" type="email" inputMode="email" autoComplete="email" required maxLength={160} placeholder="name@company.com" /></label>
      <label>电话（选填）<input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="方便联系的电话号码" /></label>
      <label className="contact-message">你的需求<textarea name="message" required minLength={10} maxLength={2000} rows={6} placeholder="例如：希望先监测一个品牌在豆包、腾讯元宝和 DeepSeek 的表现，并建立优化前基线。" /></label>
      <label className="contact-honeypot" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="contact-consent"><input name="consent" type="checkbox" required /> <span>我同意 Quarzion 使用以上信息回复本次咨询。</span></label>
    </div>
    {error ? <div className="contact-error" role="alert">{error}</div> : null}
    <button className="contact-submit" disabled={state === "sending"}>{state === "sending" ? "正在安全提交…" : "提交预约"}</button>
    <small className="contact-privacy">不会公开你的信息，也不会自动创建客户账号。</small>
  </form>;
}
