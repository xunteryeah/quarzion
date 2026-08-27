#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-}"

if [[ -z "${backup_dir}" || ! -d "${backup_dir}" ]]; then
  echo "Usage: restore-verify.sh <backup-directory>" >&2
  exit 2
fi

required_files=(
  "SHA256SUMS"
  "config/.env"
  "config/admin.htpasswd"
  "config/docker-compose.yml"
  "config/nginx.conf"
  "databases/quarzion.sqlite"
  "databases/quarzion-admin.sqlite"
  "source/frontend.tar.gz"
  "source/admin.tar.gz"
)

for required_file in "${required_files[@]}"; do
  if [[ ! -f "${backup_dir}/${required_file}" ]]; then
    echo "Missing backup artifact: ${required_file}" >&2
    exit 1
  fi
done

(
  cd "${backup_dir}"
  sha256sum -c SHA256SUMS >/dev/null
)

verify_dir="$(mktemp -d /tmp/quarzion-restore-verify.XXXXXX)"
verify_id="$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}"
frontend_volume="quarzion_p0_restore_frontend_${verify_id}"
admin_volume="quarzion_p0_restore_admin_${verify_id}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  docker volume rm "${frontend_volume}" "${admin_volume}" >/dev/null 2>&1 || true
  rm -rf "${verify_dir}"
}
trap cleanup EXIT

tar -xzf "${backup_dir}/source/frontend.tar.gz" -C "${verify_dir}"
tar -xzf "${backup_dir}/source/admin.tar.gz" -C "${verify_dir}"
test -f "${verify_dir}/frontend/package.json"
test -f "${verify_dir}/admin/package.json"

docker run --rm \
  -v "${backup_dir}/config/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "${backup_dir}/config/admin.htpasswd:/etc/nginx/secrets/admin.htpasswd:ro" \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  nginx:alpine nginx -t >/dev/null

docker volume create "${frontend_volume}" >/dev/null
docker volume create "${admin_volume}" >/dev/null

docker run --rm --user 0:0 \
  -v "${backup_dir}/databases:/backup:ro" \
  -v "${frontend_volume}:/data" \
  node:22-bookworm-slim \
  cp /backup/quarzion.sqlite /data/quarzion.sqlite

docker run --rm --user 0:0 \
  -v "${backup_dir}/databases:/backup:ro" \
  -v "${admin_volume}:/data" \
  node:22-bookworm-slim \
  cp /backup/quarzion-admin.sqlite /data/quarzion-admin.sqlite

docker run --rm --user 0:0 \
  -v "${frontend_volume}:/data:ro" \
  -v "${script_dir}:/scripts:ro" \
  node:22-bookworm-slim \
  node --experimental-sqlite /scripts/sqlite-inventory.mjs /data/quarzion.sqlite restored-frontend \
  > "${verify_dir}/restored-frontend.json"

docker run --rm --user 0:0 \
  -v "${admin_volume}:/data:ro" \
  -v "${script_dir}:/scripts:ro" \
  node:22-bookworm-slim \
  node --experimental-sqlite /scripts/sqlite-inventory.mjs /data/quarzion-admin.sqlite restored-admin \
  > "${verify_dir}/restored-admin.json"

grep -q '"integrity": "ok"' "${verify_dir}/restored-frontend.json"
grep -q '"integrity": "ok"' "${verify_dir}/restored-admin.json"

printf 'restore_verification=passed\n'
printf 'backup_dir=%s\n' "${backup_dir}"
