#!/usr/bin/env bash
set -euo pipefail

quarzion_root="${QUARZION_ROOT:-/opt/quarzion}"
release_dir="${1:-${QUARZION_RELEASE_DIR:-}}"
[[ -n "${release_dir}" ]] || { echo "Usage: p1-production-preflight.sh /opt/quarzion/releases/<release>" >&2; exit 2; }
release_dir="$(realpath "${release_dir}")"
[[ "${release_dir}" == "${quarzion_root}/releases/"* ]] || { echo "Release path is outside ${quarzion_root}/releases" >&2; exit 2; }

for file in ops/docker-compose.p1.yml database/migrations/0005_scheduler.sql collector/Dockerfile collector/package-lock.json ops/quarzion-scheduler.service ops/quarzion-scheduler.timer P1_REAL_COLLECTION_TASKS.md; do
  [[ -f "${release_dir}/${file}" ]] || { echo "Missing P1 release file: ${file}" >&2; exit 1; }
done

"${release_dir}/scripts/p0-production-preflight.sh" "${release_dir}"

environment_file="${quarzion_root}/.env"
value_of() { awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "${environment_file}"; }
collector_image="${QUARZION_COLLECTOR_IMAGE:-$(value_of QUARZION_COLLECTOR_IMAGE)}"
[[ -n "${collector_image}" ]] && docker image inspect "${collector_image}" >/dev/null 2>&1 || { echo "P1 collector image is missing: ${collector_image:-unset}" >&2; exit 1; }

available_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
if [[ "${ENABLE_P1_COLLECTOR:-NO}" == "YES" && "${available_kb}" -lt 500000 ]]; then
  echo "Not enough available memory to safely start the official API worker" >&2
  exit 1
fi

docker compose -f "${release_dir}/ops/docker-compose.p1.yml" --env-file "${environment_file}" config >/dev/null
printf '{"ready":true,"phase":"p1","collector_enabled":"%s","time":"%s"}\n' "${ENABLE_P1_COLLECTOR:-NO}" "$(date -u +%FT%TZ)"
