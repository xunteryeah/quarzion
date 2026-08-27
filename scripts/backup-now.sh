#!/usr/bin/env bash
set -euo pipefail

quarzion_root="/opt/quarzion"
backup_root="${QUARZION_BACKUP_ROOT:-${quarzion_root}/backups}"
backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/${backup_stamp}-p0-baseline"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "${backup_dir}/config" "${backup_dir}/databases" "${backup_dir}/metadata" "${backup_dir}/source"
chmod 700 "${backup_dir}"

cp -p "${quarzion_root}/docker-compose.yml" "${backup_dir}/config/docker-compose.yml"
cp -p "${quarzion_root}/nginx.conf" "${backup_dir}/config/nginx.conf"
cp -p "${quarzion_root}/.env" "${backup_dir}/config/.env"
cp -p "${quarzion_root}/secrets/admin.htpasswd" "${backup_dir}/config/admin.htpasswd"
chmod 600 "${backup_dir}/config/.env" "${backup_dir}/config/admin.htpasswd"

tar \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.wrangler' \
  -czf "${backup_dir}/source/frontend.tar.gz" \
  -C "${quarzion_root}" frontend

tar \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.wrangler' \
  -czf "${backup_dir}/source/admin.tar.gz" \
  -C "${quarzion_root}" admin

docker image inspect quarzion-frontend:latest quarzion-admin:latest > "${backup_dir}/metadata/images.json"
docker inspect quarzion-frontend quarzion-admin quarzion-nginx > "${backup_dir}/metadata/containers.json"
docker ps --format '{{json .}}' > "${backup_dir}/metadata/docker-ps.jsonl"
certbot certificates > "${backup_dir}/metadata/certificates.txt" 2>&1

docker run --rm --user 0:0 \
  -v quarzion_frontend-data:/data:ro \
  -v "${backup_dir}/databases:/backup" \
  -v "${script_dir}:/scripts:ro" \
  node:22-bookworm-slim \
  node --experimental-sqlite /scripts/sqlite-backup.mjs /data/quarzion.sqlite /backup/quarzion.sqlite

docker run --rm --user 0:0 \
  -v quarzion_admin-data:/data:ro \
  -v "${backup_dir}/databases:/backup" \
  -v "${script_dir}:/scripts:ro" \
  node:22-bookworm-slim \
  node --experimental-sqlite /scripts/sqlite-backup.mjs /data/quarzion-admin.sqlite /backup/quarzion-admin.sqlite

docker run --rm --user 0:0 \
  -v "${backup_dir}/databases:/backup:ro" \
  -v "${script_dir}:/scripts:ro" \
  node:22-bookworm-slim \
  node --experimental-sqlite /scripts/sqlite-inventory.mjs /backup/quarzion.sqlite frontend \
  > "${backup_dir}/metadata/frontend-inventory.json"

docker run --rm --user 0:0 \
  -v "${backup_dir}/databases:/backup:ro" \
  -v "${script_dir}:/scripts:ro" \
  node:22-bookworm-slim \
  node --experimental-sqlite /scripts/sqlite-inventory.mjs /backup/quarzion-admin.sqlite admin \
  > "${backup_dir}/metadata/admin-inventory.json"

(
  cd "${backup_dir}"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

chmod -R go-rwx "${backup_dir}"

printf 'backup_dir=%s\n' "${backup_dir}"
printf 'frontend_db=%s\n' "${backup_dir}/databases/quarzion.sqlite"
printf 'admin_db=%s\n' "${backup_dir}/databases/quarzion-admin.sqlite"
