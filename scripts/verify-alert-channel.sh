#!/usr/bin/env bash
set -euo pipefail

environment_file="${QUARZION_ENV_FILE:-/opt/quarzion/.env}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "${environment_file}" ]] || { echo "Missing environment file: ${environment_file}" >&2; exit 1; }

value_of() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "${environment_file}"
}

QUARZION_ALERT_WEBHOOK_URL="$(value_of QUARZION_ALERT_WEBHOOK_URL)" \
RESEND_API_KEY="$(value_of RESEND_API_KEY)" \
QUARZION_FROM_EMAIL="$(value_of QUARZION_FROM_EMAIL)" \
QUARZION_CONTACT_EMAIL="$(value_of QUARZION_CONTACT_EMAIL)" \
QUARZION_ALERT_EMAIL="$(value_of QUARZION_ALERT_EMAIL)" \
  "${script_dir}/notify-alert.sh" "Quarzion P0 alert channel verification"
printf 'alert_channel=verified\n'
