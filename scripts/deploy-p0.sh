#!/usr/bin/env bash
set -euo pipefail

quarzion_root="${QUARZION_ROOT:-/opt/quarzion}"
release_dir="${1:-}"
[[ "${CONFIRM_P0_DEPLOY:-}" == "YES" ]] || { echo "Set CONFIRM_P0_DEPLOY=YES after reviewing preflight" >&2; exit 2; }
[[ -n "${release_dir}" ]] || { echo "Usage: deploy-p0.sh /opt/quarzion/releases/<release>" >&2; exit 2; }
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

"${release_dir}/scripts/p0-production-preflight.sh" "${release_dir}"
email_mode="$(value_of QUARZION_EMAIL_MODE)"
if [[ "${email_mode}" == "resend" ]]; then
  "${release_dir}/scripts/verify-email-provider.sh"
  "${release_dir}/scripts/verify-alert-channel.sh"
else
  printf '{"event":"email_delivery_deferred","mode":"%s","time":"%s"}\n' "${email_mode}" "$(date -u +%FT%TZ)"
fi

certbot certonly --non-interactive --webroot --webroot-path "${quarzion_root}/acme" --cert-name windcall.cn --expand \
  -d windcall.cn -d www.windcall.cn -d admin.windcall.cn -d app.windcall.cn -d api.windcall.cn
for host in windcall.cn www.windcall.cn admin.windcall.cn app.windcall.cn api.windcall.cn; do
  openssl x509 -in /etc/letsencrypt/live/windcall.cn/fullchain.pem -noout -ext subjectAltName | grep -q "DNS:${host}"
done

if docker volume inspect quarzion_unified-data >/dev/null 2>&1; then
  "${release_dir}/scripts/backup-production.sh"
else
  "${quarzion_root}/scripts/backup-now.sh"
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
snapshot="${quarzion_root}/backups/${stamp}-before-p0-deploy"
mkdir -p "${snapshot}/config" "${snapshot}/metadata"
chmod 700 "${snapshot}"
cp -p "${quarzion_root}/docker-compose.yml" "${snapshot}/config/docker-compose.yml"
cp -p "${quarzion_root}/nginx.conf" "${snapshot}/config/nginx.conf"
cp -p "${environment_file}" "${snapshot}/config/.env"
if [[ -L "${quarzion_root}/current" ]]; then
  readlink -f "${quarzion_root}/current" > "${snapshot}/metadata/current-target.txt" 2>/dev/null || : > "${snapshot}/metadata/current-target.txt"
else
  : > "${snapshot}/metadata/current-target.txt"
fi
for unit in quarzion-backup.timer quarzion-health.timer quarzion-email-delivery.timer; do
  printf '%s\t%s\t%s\n' "${unit}" "$(systemctl is-enabled "${unit}" 2>/dev/null || true)" "$(systemctl is-active "${unit}" 2>/dev/null || true)"
done > "${snapshot}/metadata/timer-states.tsv"
docker ps --format '{{json .}}' > "${snapshot}/metadata/docker-ps.jsonl"
chmod -R go-rwx "${snapshot}"

rollback() {
  status=$?
  if [[ ${status} -ne 0 ]]; then
    "${release_dir}/scripts/rollback-p0.sh" "${snapshot}" || true
  fi
  exit "${status}"
}
trap rollback EXIT

frontend_image="${QUARZION_FRONTEND_IMAGE:-$(value_of QUARZION_FRONTEND_IMAGE)}"
admin_image="${QUARZION_ADMIN_IMAGE:-$(value_of QUARZION_ADMIN_IMAGE)}"
set_value QUARZION_FRONTEND_IMAGE "${frontend_image}"
set_value QUARZION_ADMIN_IMAGE "${admin_image}"

cp -p "${release_dir}/ops/docker-compose.p0.yml" "${quarzion_root}/docker-compose.yml"
cp -p "${release_dir}/ops/nginx.p0.conf" "${quarzion_root}/nginx.conf"
cp -a "${release_dir}/scripts/." "${quarzion_root}/scripts/"
chmod 700 "${quarzion_root}/scripts/"*.sh
install -d -m 0750 "${quarzion_root}/logs/nginx"
ln -sfn "${release_dir}" "${quarzion_root}/current"

cd "${quarzion_root}"
docker compose config >/dev/null
docker compose up -d --remove-orphans
docker compose exec -T nginx nginx -t
docker compose exec -T --user nginx nginx sh -c 'test -r /etc/nginx/secrets/admin.htpasswd'
docker compose exec -T nginx nginx -s reload

install -m 0644 "${release_dir}/ops/quarzion-alert@.service" /etc/systemd/system/
install -m 0644 "${release_dir}/ops/quarzion-logrotate" /etc/logrotate.d/quarzion
for unit in quarzion-backup.service quarzion-backup.timer quarzion-health.service quarzion-health.timer quarzion-email-delivery.service quarzion-email-delivery.timer; do
  install -m 0644 "${release_dir}/ops/${unit}" "/etc/systemd/system/${unit}"
done
systemctl daemon-reload
systemctl enable --now quarzion-backup.timer quarzion-health.timer quarzion-email-delivery.timer

local_status() {
  local host="$1" path="$2" method="${3:-GET}"
  curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' \
    --resolve "${host}:443:127.0.0.1" -X "${method}" "https://${host}${path}"
}
[[ "$(local_status windcall.cn /)" == "200" ]]
[[ "$(local_status app.windcall.cn /login)" == "200" ]]
[[ "$(local_status app.windcall.cn /api/dashboard)" == "401" ]]
[[ "$(local_status api.windcall.cn /api/health)" == "200" ]]
[[ "$(local_status api.windcall.cn /)" == "404" ]]
[[ "$(local_status admin.windcall.cn /)" == "401" ]]
[[ "$(local_status app.windcall.cn /api/internal/email-delivery POST)" == "404" ]]
"${quarzion_root}/scripts/health-check.sh"

trap - EXIT
printf '{"event":"p0_deploy_completed","release":"%s","rollback_snapshot":"%s","time":"%s"}\n' "${release_dir}" "${snapshot}" "$(date -u +%FT%TZ)"
