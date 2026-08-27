#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failures=()

check_url() {
  local name="$1" url="$2" expected="$3"
  local status
  status="$(curl --silent --show-error --max-time 12 --output /dev/null --write-out '%{http_code}' "${url}" || true)"
  [[ "${status}" == "${expected}" ]] || failures+=("${name}:${status:-unreachable}")
}

check_url website https://quarzion.com/ 200
check_url admin https://admin.quarzion.com/ 401
if getent hosts app.quarzion.com >/dev/null 2>&1; then check_url customer_app https://app.quarzion.com/login 200; fi
if getent hosts api.quarzion.com >/dev/null 2>&1; then check_url api_health https://api.quarzion.com/api/health 200; fi

for container in quarzion-frontend quarzion-admin quarzion-nginx; do
  running="$(docker inspect --format '{{.State.Running}}' "${container}" 2>/dev/null || true)"
  [[ "${running}" == "true" ]] || failures+=("container:${container}")
done

email_failures="$(docker exec quarzion-frontend node --experimental-sqlite -e '
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(process.env.QUARZION_DB_PATH || "/data/quarzion.sqlite");
const table = db.prepare("SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?").get("table", "email_outbox");
if (!table) { process.stdout.write("0"); process.exit(0); }
const queueOnly = process.env.QUARZION_EMAIL_MODE === "queue_only";
const row = queueOnly
  ? db.prepare("SELECT COUNT(*) AS count FROM email_outbox WHERE status = ?").get("failed")
  : db.prepare("SELECT COUNT(*) AS count FROM email_outbox WHERE status = ? OR (status IN (?,?) AND created_at < ?)").get("failed", "pending", "retry", new Date(Date.now() - 30 * 60_000).toISOString());
process.stdout.write(String(row.count));
' 2>/dev/null || true)"
if [[ ! "${email_failures}" =~ ^[0-9]+$ ]]; then failures+=("email_outbox:unreadable");
elif [[ "${email_failures}" -gt 0 ]]; then failures+=("email_outbox:${email_failures}"); fi

disk_usage="$(df -P /opt/quarzion | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [[ "${disk_usage:-100}" -ge "${QUARZION_DISK_ALERT_PERCENT:-85}" ]]; then failures+=("disk:${disk_usage}%"); fi

if ! openssl x509 -checkend 1814400 -noout -in /etc/letsencrypt/live/quarzion.com/fullchain.pem >/dev/null 2>&1; then failures+=("certificate:expires_within_21_days"); fi

if [[ ${#failures[@]} -gt 0 ]]; then
  message="Quarzion health check failed: ${failures[*]}"
  printf '{"level":"error","event":"health_check_failed","details":"%s","time":"%s"}\n' "${failures[*]}" "$(date -u +%FT%TZ)" >&2
  "${script_dir}/notify-alert.sh" "${message}" || true
  exit 1
fi

printf '{"level":"info","event":"health_check_passed","time":"%s"}\n' "$(date -u +%FT%TZ)"
