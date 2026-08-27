#!/usr/bin/env bash
set -euo pipefail

environment_file="${QUARZION_ENV_FILE:-/opt/quarzion/.env}"
[[ -f "${environment_file}" ]] || { echo "Missing environment file: ${environment_file}" >&2; exit 1; }

docker run --rm --env-file "${environment_file}" node:22-bookworm-slim node -e '
const required = ["RESEND_API_KEY", "QUARZION_FROM_EMAIL", "QUARZION_CONTACT_EMAIL"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);
fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
  body: JSON.stringify({
    from: process.env.QUARZION_FROM_EMAIL,
    to: [process.env.QUARZION_CONTACT_EMAIL],
    subject: "[Quarzion P0] 正式环境邮件投递验证",
    html: "<h2>Quarzion 邮件通道验证成功</h2><p>这封邮件由正式发布前检查发送，不是客户咨询。</p>",
  }),
}).then(async (response) => {
  if (!response.ok) throw new Error(`Resend verification returned ${response.status}`);
  process.stdout.write("email_provider=verified\n");
}).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
'
