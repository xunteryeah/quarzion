#!/usr/bin/env bash
set -euo pipefail

container="${QUARZION_FRONTEND_CONTAINER:-quarzion-frontend}"

docker exec "${container}" node -e '
const key = process.env.QUARZION_DELIVERY_KEY;
if (!key) throw new Error("QUARZION_DELIVERY_KEY is required");
fetch("http://127.0.0.1:3000/api/internal/email-delivery", {
  method: "POST",
  headers: { authorization: `Bearer ${key}` },
}).then(async (response) => {
  const body = await response.text();
  if (!response.ok) throw new Error(`email delivery worker returned ${response.status}: ${body}`);
  process.stdout.write(`${body}\n`);
}).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
'
