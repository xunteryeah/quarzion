#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-}"
if [[ -z "${backup_dir}" || ! -d "${backup_dir}" ]]; then
  echo "Usage: restore-production-verify.sh <backup-directory>" >&2
  exit 2
fi

for required_file in SHA256SUMS config/.env config/admin.htpasswd config/docker-compose.yml config/nginx.conf source/application.tar.gz; do
  [[ -f "${backup_dir}/${required_file}" ]] || { echo "Missing backup artifact: ${required_file}" >&2; exit 1; }
done
(
  cd "${backup_dir}"
  sha256sum -c SHA256SUMS >/dev/null
)

verify_dir="$(mktemp -d /tmp/quarzion-production-restore.XXXXXX)"
verify_id="$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}"
restore_volume="quarzion_p0_restore_${verify_id}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  docker volume rm "${restore_volume}" >/dev/null 2>&1 || true
  rm -rf -- "${verify_dir}"
}
trap cleanup EXIT

tar -xzf "${backup_dir}/source/application.tar.gz" -C "${verify_dir}"
test -f "${verify_dir}/frontend/package.json"
test -f "${verify_dir}/admin/package.json"
if [[ -d "${verify_dir}/database" ]]; then test -f "${verify_dir}/database/migrations/0001_unified.sql"; fi

docker run --rm \
  -v "${backup_dir}/config/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "${backup_dir}/config/admin.htpasswd:/etc/nginx/secrets/admin.htpasswd:ro" \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  nginx:alpine nginx -t >/dev/null

if [[ -f "${backup_dir}/databases/quarzion.sqlite" && -f "${backup_dir}/metadata/unified-inventory.json" ]]; then
  docker volume create "${restore_volume}" >/dev/null
  docker run --rm --user 0:0 -v "${backup_dir}/databases:/backup:ro" -v "${restore_volume}:/data" node:22-bookworm-slim cp /backup/quarzion.sqlite /data/quarzion.sqlite
  docker run --rm --user 0:0 -v "${restore_volume}:/data:ro" -v "${script_dir}:/scripts:ro" node:22-bookworm-slim \
    node --experimental-sqlite /scripts/sqlite-inventory.mjs /data/quarzion.sqlite restored-unified > "${verify_dir}/restored-unified.json"
  grep -q '"integrity": "ok"' "${verify_dir}/restored-unified.json"
elif [[ -f "${backup_dir}/databases/quarzion.sqlite" && -f "${backup_dir}/databases/quarzion-admin.sqlite" ]]; then
  for database in quarzion.sqlite quarzion-admin.sqlite; do
    label="${database%.sqlite}"
    docker run --rm --user 0:0 -v "${backup_dir}/databases:/backup:ro" -v "${script_dir}:/scripts:ro" node:22-bookworm-slim \
      node --experimental-sqlite /scripts/sqlite-inventory.mjs "/backup/${database}" "restored-${label}" > "${verify_dir}/restored-${label}.json"
    grep -q '"integrity": "ok"' "${verify_dir}/restored-${label}.json"
  done
else
  echo "No supported database set exists in production backup" >&2
  exit 1
fi

printf '{"level":"info","event":"restore_verification_passed","backup_dir":"%s","time":"%s"}\n' "${backup_dir}" "$(date -u +%FT%TZ)"
