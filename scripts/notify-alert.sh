#!/usr/bin/env bash
set -euo pipefail

message="${1:-WindCall production alert}"
webhook="${QUARZION_ALERT_WEBHOOK_URL:-}"
resend_key="${RESEND_API_KEY:-}"
from_email="${QUARZION_FROM_EMAIL:-}"
alert_email="${QUARZION_ALERT_EMAIL:-${QUARZION_CONTACT_EMAIL:-}}"
log_file="${QUARZION_ALERT_LOG:-/opt/quarzion/logs/alerts.jsonl}"
event_time="$(date -u +%FT%TZ)"

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "${value}"
}

payload="$(printf '{\"text\":\"%s\",\"source\":\"quarzion-production\",\"time\":\"%s\"}' "$(json_escape "${message}")" "$(date -u +%FT%TZ)")"

mkdir -p "$(dirname "${log_file}")"
printf '{"level":"error","event":"production_alert","message":"%s","time":"%s"}\n' \
  "$(json_escape "${message}")" "${event_time}" >> "${log_file}"
chmod 600 "${log_file}"

if [[ -n "${webhook}" ]]; then
  curl --fail --silent --show-error --max-time 10 -H 'Content-Type: application/json' --data "${payload}" "${webhook}" >/dev/null
  printf 'alert_channel=webhook\n'
  exit 0
fi

if [[ -n "${resend_key}" && -n "${from_email}" && -n "${alert_email}" ]]; then
  email_payload="$(printf '{\"from\":\"%s\",\"to\":[\"%s\"],\"subject\":\"[WindCall] 生产环境异常通知\",\"text\":\"%s\\n\\n时间：%s\"}' \
    "$(json_escape "${from_email}")" "$(json_escape "${alert_email}")" "$(json_escape "${message}")" "${event_time}")"
  curl --fail --silent --show-error --max-time 15 \
    -H "Authorization: Bearer ${resend_key}" \
    -H 'Content-Type: application/json' \
    --data "${email_payload}" https://api.resend.com/emails >/dev/null
  printf 'alert_channel=email\n'
  exit 0
fi

printf '{"level":"error","event":"alert_not_delivered","reason":"no_external_channel","time":"%s"}\n' "${event_time}" >&2
exit 1
