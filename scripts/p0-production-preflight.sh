#!/usr/bin/env bash
set -euo pipefail

quarzion_root="${QUARZION_ROOT:-/opt/quarzion}"
environment_file="${QUARZION_ENV_FILE:-${quarzion_root}/.env}"
admin_password_file="${QUARZION_ADMIN_PASSWORD_FILE:-${quarzion_root}/secrets/admin.htpasswd}"
expected_ip="${QUARZION_EXPECTED_IP:-47.236.194.150}"
release_dir="${1:-${QUARZION_RELEASE_DIR:-}}"
failures=()

value_of() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "${environment_file}" 2>/dev/null || true
}

require_value() {
  local key="$1" value
  value="$(value_of "${key}")"
  if [[ -z "${value}" || "${value}" == replace-with-* ]]; then failures+=("env:${key}"); fi
}

for host in app.windcall.cn api.windcall.cn admin.windcall.cn; do
  resolved="$(getent ahostsv4 "${host}" 2>/dev/null | awk '{print $1}' | sort -u | paste -sd, - || true)"
  if [[ ",${resolved}," != *",${expected_ip},"* ]] && command -v dig >/dev/null 2>&1; then
    public_resolved="$(for resolver in 8.8.8.8 1.1.1.1; do dig +tcp +time=5 +tries=1 +short @"${resolver}" A "${host}" 2>/dev/null || true; done | sort -u | paste -sd, -)"
    resolved="${resolved}${resolved:+,}${public_resolved}"
  fi
  [[ ",${resolved}," == *",${expected_ip},"* ]] || failures+=("dns:${host}:${resolved:-absent}")
done

[[ -f "${environment_file}" ]] || failures+=("file:${environment_file}")
[[ -f "${admin_password_file}" ]] || failures+=("file:${admin_password_file}")
if [[ -f "${admin_password_file}" ]]; then
  password_mode="$(stat -c '%a' "${admin_password_file}" 2>/dev/null || true)"
  [[ "${password_mode}" == "640" || "${password_mode}" == "600" ]] || failures+=("permission:admin-htpasswd:${password_mode:-unknown}")
fi
secrets_mode="$(stat -c '%a' "${quarzion_root}/secrets" 2>/dev/null || true)"
[[ "${secrets_mode}" == "750" || "${secrets_mode}" == "700" ]] || failures+=("permission:secrets-dir:${secrets_mode:-unknown}")
for key in GEO_PROOF_INGEST_KEY QUARZION_SCHEDULER_KEY QUARZION_AUDIT_SALT QUARZION_OUTBOX_ENCRYPTION_KEY QUARZION_DELIVERY_KEY QUARZION_APP_URL QUARZION_EMAIL_MODE; do
  require_value "${key}"
done

email_mode="$(value_of QUARZION_EMAIL_MODE)"
if [[ "${email_mode}" == "resend" ]]; then
  for key in QUARZION_FROM_EMAIL QUARZION_CONTACT_EMAIL RESEND_API_KEY; do require_value "${key}"; done
elif [[ "${email_mode}" != "queue_only" ]]; then
  failures+=("email-mode:${email_mode:-absent}")
fi

for key in GEO_PROOF_INGEST_KEY QUARZION_SCHEDULER_KEY QUARZION_AUDIT_SALT QUARZION_OUTBOX_ENCRYPTION_KEY QUARZION_DELIVERY_KEY; do
  value="$(value_of "${key}")"
  [[ "${value}" =~ ^[a-fA-F0-9]{64}$ ]] || failures+=("secret-format:${key}")
done

offsite_ack="${quarzion_root}/.offsite-backup-ack"
if [[ ! -s "${offsite_ack}" ]]; then
  failures+=("offsite:no-ack")
elif ! find "${offsite_ack}" -mmin -2880 -print -quit | grep -q .; then
  failures+=("offsite:stale-ack")
fi

if [[ -n "${release_dir}" ]]; then
  release_dir="$(realpath "${release_dir}" 2>/dev/null || true)"
  [[ "${release_dir}" == "${quarzion_root}/releases/"* ]] || failures+=("release:path")
  for file in ops/docker-compose.p0.yml ops/nginx.p0.conf ops/quarzion-logrotate scripts/backup-production.sh scripts/restore-production-verify.sh scripts/process-email-outbox.sh scripts/verify-email-provider.sh scripts/verify-alert-channel.sh scripts/notify-alert.sh; do
    [[ -f "${release_dir}/${file}" ]] || failures+=("release:${file}")
  done
fi

frontend_image="${QUARZION_FRONTEND_IMAGE:-$(value_of QUARZION_FRONTEND_IMAGE)}"
admin_image="${QUARZION_ADMIN_IMAGE:-$(value_of QUARZION_ADMIN_IMAGE)}"
[[ -n "${frontend_image}" ]] && docker image inspect "${frontend_image}" >/dev/null 2>&1 || failures+=("image:frontend")
[[ -n "${admin_image}" ]] && docker image inspect "${admin_image}" >/dev/null 2>&1 || failures+=("image:admin")

if [[ ${#failures[@]} -gt 0 ]]; then
  printf '{"ready":false,"failures":"%s","time":"%s"}\n' "${failures[*]}" "$(date -u +%FT%TZ)" >&2
  exit 1
fi

printf '{"ready":true,"expected_ip":"%s","email_mode":"%s","time":"%s"}\n' "${expected_ip}" "${email_mode}" "$(date -u +%FT%TZ)"
