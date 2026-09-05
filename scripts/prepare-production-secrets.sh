#!/usr/bin/env bash
set -euo pipefail

environment_file="${QUARZION_ENV_FILE:-/opt/quarzion/.env}"
[[ -f "${environment_file}" ]] || { echo "Missing environment file: ${environment_file}" >&2; exit 1; }

backup="${environment_file}.before-p0-secrets.$(date -u +%Y%m%dT%H%M%SZ)"
cp -p "${environment_file}" "${backup}"
chmod 600 "${environment_file}" "${backup}"

value_of() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "${environment_file}"
}

set_value() {
  local key="$1" value="$2" temporary
  temporary="$(mktemp "${environment_file}.XXXXXX")"
  awk -F= -v key="${key}" -v value="${value}" '
    BEGIN { found = 0 }
    $1 == key { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "${environment_file}" > "${temporary}"
  chmod 600 "${temporary}"
  mv "${temporary}" "${environment_file}"
}

for key in GEO_PROOF_INGEST_KEY QUARZION_AUDIT_SALT QUARZION_OUTBOX_ENCRYPTION_KEY QUARZION_DELIVERY_KEY; do
  value="$(value_of "${key}")"
  if [[ ! "${value}" =~ ^[a-fA-F0-9]{64}$ ]]; then
    set_value "${key}" "$(openssl rand -hex 32)"
    printf 'generated=%s\n' "${key}"
  else
    printf 'preserved=%s\n' "${key}"
  fi
done

if [[ -z "$(value_of QUARZION_APP_URL)" ]]; then
  set_value QUARZION_APP_URL "https://app.windcall.cn"
  printf 'configured=QUARZION_APP_URL\n'
fi

if [[ -n "${QUARZION_FRONTEND_IMAGE:-}" && -n "${QUARZION_ADMIN_IMAGE:-}" ]]; then
  set_value QUARZION_FRONTEND_IMAGE "${QUARZION_FRONTEND_IMAGE}"
  set_value QUARZION_ADMIN_IMAGE "${QUARZION_ADMIN_IMAGE}"
  printf 'configured=QUARZION_RELEASE_IMAGES\n'
fi

printf 'backup=%s\n' "${backup}"
