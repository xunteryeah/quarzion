#!/usr/bin/env bash
set -euo pipefail

quarzion_root="${QUARZION_ROOT:-/opt/quarzion}"
release_dir="${1:-}"
[[ "${CONFIRM_P1_DEPLOY:-}" == "YES" ]] || { echo "Set CONFIRM_P1_DEPLOY=YES after reviewing P1 preflight" >&2; exit 2; }
[[ -n "${release_dir}" ]] || { echo "Usage: deploy-p1.sh /opt/quarzion/releases/<release>" >&2; exit 2; }
release_dir="$(realpath "${release_dir}")"
[[ "${release_dir}" == "${quarzion_root}/releases/"* ]] || { echo "Release must be under ${quarzion_root}/releases" >&2; exit 2; }

environment_file="${quarzion_root}/.env"
value_of() { awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "${environment_file}"; }
set_value() {
  local key="$1" value="$2" temporary
  temporary="$(mktemp "${environment_file}.XXXXXX")"
  awk -F= -v key="${key}" -v value="${value}" 'BEGIN{found=0} $1==key{print key "=" value;found=1;next}{print} END{if(!found)print key "=" value}' "${environment_file}" > "${temporary}"
  chmod 600 "${temporary}"; mv "${temporary}" "${environment_file}"
}

"${release_dir}/scripts/p1-production-preflight.sh" "${release_dir}"
"${release_dir}/scripts/backup-production.sh"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
snapshot="${quarzion_root}/backups/${stamp}-before-p1-deploy"
mkdir -p "${snapshot}/config" "${snapshot}/metadata"
chmod 700 "${snapshot}"
cp -p "${quarzion_root}/docker-compose.yml" "${snapshot}/config/docker-compose.yml"
cp -p "${quarzion_root}/nginx.conf" "${snapshot}/config/nginx.conf"
cp -p "${environment_file}" "${snapshot}/config/.env"
if [[ -L "${quarzion_root}/current" ]]; then readlink -f "${quarzion_root}/current" > "${snapshot}/metadata/current-target.txt"; else : > "${snapshot}/metadata/current-target.txt"; fi
docker ps --format '{{json .}}' > "${snapshot}/metadata/docker-ps.jsonl"
chmod -R go-rwx "${snapshot}"

rollback() {
  status=$?
  if [[ ${status} -ne 0 ]]; then "${release_dir}/scripts/rollback-p0.sh" "${snapshot}" || true; fi
  exit "${status}"
}
trap rollback EXIT

frontend_image="${QUARZION_FRONTEND_IMAGE:-$(value_of QUARZION_FRONTEND_IMAGE)}"
admin_image="${QUARZION_ADMIN_IMAGE:-$(value_of QUARZION_ADMIN_IMAGE)}"
collector_image="${QUARZION_COLLECTOR_IMAGE:-$(value_of QUARZION_COLLECTOR_IMAGE)}"
set_value QUARZION_FRONTEND_IMAGE "${frontend_image}"
set_value QUARZION_ADMIN_IMAGE "${admin_image}"
set_value QUARZION_COLLECTOR_IMAGE "${collector_image}"

cp -p "${release_dir}/ops/docker-compose.p1.yml" "${quarzion_root}/docker-compose.yml"
cp -p "${release_dir}/ops/nginx.p0.conf" "${quarzion_root}/nginx.conf"
cp -a "${release_dir}/scripts/." "${quarzion_root}/scripts/"
chmod 700 "${quarzion_root}/scripts/"*.sh
install -d -m 0750 "${quarzion_root}/logs/nginx"
ln -sfn "${release_dir}" "${quarzion_root}/current"

cd "${quarzion_root}"
docker compose config >/dev/null

# The frontend owns additive schema migration. Starting it first prevents two
# application containers from attempting the same ALTER TABLE concurrently.
docker compose up -d --no-deps frontend
for attempt in $(seq 1 30); do
  if docker compose exec -T frontend node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{const j=await r.json();if(!r.ok||j.migration!=='0005_scheduler')process.exit(1)}).catch(()=>process.exit(1))"; then break; fi
  [[ "${attempt}" -lt 30 ]] || { echo "P1 frontend migration did not become healthy" >&2; exit 1; }
  sleep 2
done

docker compose up -d --no-deps admin
docker compose up -d --no-deps nginx
docker compose exec -T nginx nginx -t
docker compose exec -T --user nginx nginx sh -c 'test -r /etc/nginx/secrets/admin.htpasswd'
docker compose exec -T nginx nginx -s reload

install -m 0644 "${release_dir}/ops/quarzion-scheduler.service" /etc/systemd/system/quarzion-scheduler.service
install -m 0644 "${release_dir}/ops/quarzion-scheduler.timer" /etc/systemd/system/quarzion-scheduler.timer
systemctl daemon-reload
systemctl enable --now quarzion-scheduler.timer

if [[ "${ENABLE_P1_COLLECTOR:-NO}" == "YES" ]]; then
  docker compose --profile collector up -d collector
else
  docker rm -f quarzion-collector >/dev/null 2>&1 || true
fi

local_status() {
  local host="$1" path="$2"
  curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' --resolve "${host}:443:127.0.0.1" "https://${host}${path}"
}
[[ "$(local_status windcall.cn /)" == "200" ]]
[[ "$(local_status app.windcall.cn /login)" == "200" ]]
[[ "$(local_status app.windcall.cn /api/dashboard)" == "401" ]]
[[ "$(local_status api.windcall.cn /api/health)" == "200" ]]
[[ "$(local_status admin.windcall.cn /)" == "401" ]]
"${quarzion_root}/scripts/health-check.sh"

trap - EXIT
printf '{"event":"p1_deploy_completed","release":"%s","collector_enabled":"%s","rollback_snapshot":"%s","time":"%s"}\n' "${release_dir}" "${ENABLE_P1_COLLECTOR:-NO}" "${snapshot}" "$(date -u +%FT%TZ)"
