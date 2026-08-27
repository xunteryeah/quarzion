#!/usr/bin/env bash
set -euo pipefail

quarzion_root="${QUARZION_ROOT:-/opt/quarzion}"
backup_root="${QUARZION_BACKUP_ROOT:-${quarzion_root}/backups}"
backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/${backup_stamp}-p0-production"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_root="${QUARZION_SOURCE_ROOT:-${quarzion_root}/current}"
[[ -d "${source_root}" ]] || source_root="${quarzion_root}"
retention_days="${QUARZION_BACKUP_RETENTION_DAYS:-14}"
unified_volume="${QUARZION_UNIFIED_VOLUME:-quarzion_unified-data}"
nginx_config="${QUARZION_NGINX_CONF:-${quarzion_root}/nginx.conf}"
environment_file="${QUARZION_ENV_FILE:-${quarzion_root}/.env}"
admin_password_file="${QUARZION_ADMIN_PASSWORD_FILE:-${quarzion_root}/secrets/admin.htpasswd}"
frontend_image="$(docker inspect --format '{{.Image}}' quarzion-frontend 2>/dev/null || true)"
admin_image="$(docker inspect --format '{{.Image}}' quarzion-admin 2>/dev/null || true)"
[[ -n "${frontend_image}" ]] || frontend_image="${QUARZION_FRONTEND_IMAGE:-quarzion-frontend:latest}"
[[ -n "${admin_image}" ]] || admin_image="${QUARZION_ADMIN_IMAGE:-quarzion-admin:latest}"

exec 9>"${quarzion_root}/.backup.lock"
if ! flock -n 9; then
  printf '{"level":"warning","event":"backup_skipped","reason":"already_running","time":"%s"}\n' "$(date -u +%FT%TZ)"
  exit 0
fi

cleanup_failed() {
  local status=$?
  if [[ ${status} -ne 0 ]]; then
    printf '{"level":"error","event":"backup_failed","status":%d,"time":"%s"}\n' "${status}" "$(date -u +%FT%TZ)" >&2
    if [[ -x "${script_dir}/notify-alert.sh" ]]; then
      "${script_dir}/notify-alert.sh" "Quarzion production backup failed (${status})" || true
    fi
  fi
  exit "${status}"
}
trap cleanup_failed EXIT

mkdir -p "${backup_dir}/config" "${backup_dir}/databases" "${backup_dir}/metadata" "${backup_dir}/source"
chmod 700 "${backup_dir}"

cp -p "${quarzion_root}/docker-compose.yml" "${backup_dir}/config/docker-compose.yml"
cp -p "${nginx_config}" "${backup_dir}/config/nginx.conf"
cp -p "${environment_file}" "${backup_dir}/config/.env"
cp -p "${admin_password_file}" "${backup_dir}/config/admin.htpasswd"
chmod 600 "${backup_dir}/config/.env" "${backup_dir}/config/admin.htpasswd"

source_components=()
for component in frontend admin database ops scripts; do
  [[ -e "${source_root}/${component}" ]] && source_components+=("${component}")
done
[[ ${#source_components[@]} -gt 0 ]] || { echo "No application source found under ${source_root}" >&2; exit 1; }
tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='.wrangler' \
  -czf "${backup_dir}/source/application.tar.gz" \
  -C "${source_root}" "${source_components[@]}"

docker image inspect "${frontend_image}" "${admin_image}" > "${backup_dir}/metadata/images.json"
docker inspect quarzion-frontend quarzion-admin quarzion-nginx > "${backup_dir}/metadata/containers.json" 2>/dev/null || true
docker ps --format '{{json .}}' > "${backup_dir}/metadata/docker-ps.jsonl"
certbot certificates > "${backup_dir}/metadata/certificates.txt" 2>&1

if docker volume inspect "${unified_volume}" >/dev/null 2>&1; then
  docker run --rm --user 0:0 \
    -v "${unified_volume}:/data:ro" \
    -v "${backup_dir}/databases:/backup" \
    -v "${script_dir}:/scripts:ro" \
    node:22-bookworm-slim \
    node --experimental-sqlite /scripts/sqlite-backup.mjs /data/quarzion.sqlite /backup/quarzion.sqlite
  docker run --rm --user 0:0 \
    -v "${backup_dir}/databases:/backup:ro" \
    -v "${script_dir}:/scripts:ro" \
    node:22-bookworm-slim \
    node --experimental-sqlite /scripts/sqlite-inventory.mjs /backup/quarzion.sqlite unified \
    > "${backup_dir}/metadata/unified-inventory.json"
else
  for legacy in frontend admin; do
    volume="quarzion_${legacy}-data"
    database="quarzion.sqlite"
    [[ "${legacy}" == "admin" ]] && database="quarzion-admin.sqlite"
    docker run --rm --user 0:0 \
      -v "${volume}:/data:ro" \
      -v "${backup_dir}/databases:/backup" \
      -v "${script_dir}:/scripts:ro" \
      node:22-bookworm-slim \
      node --experimental-sqlite /scripts/sqlite-backup.mjs "/data/${database}" "/backup/${database}"
  done
fi

(
  cd "${backup_dir}"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)
chmod -R go-rwx "${backup_dir}"

if [[ -n "${QUARZION_OFFSITE_DIR:-}" ]]; then
  offsite_target="${QUARZION_OFFSITE_DIR%/}/$(basename "${backup_dir}")"
  mkdir -p "${offsite_target}"
  cp -a "${backup_dir}/." "${offsite_target}/"
fi

if [[ "${retention_days}" =~ ^[0-9]+$ ]] && [[ "${retention_days}" -ge 7 ]]; then
  find "${backup_root}" -mindepth 1 -maxdepth 1 -type d -name '*-p0-production' -mtime "+${retention_days}" -exec rm -rf -- {} +
fi

printf '{"level":"info","event":"backup_completed","backup_dir":"%s","time":"%s"}\n' "${backup_dir}" "$(date -u +%FT%TZ)"
trap - EXIT
