#!/usr/bin/env bash
set -euo pipefail

quarzion_root="${QUARZION_ROOT:-/opt/quarzion}"
snapshot="${1:-}"
[[ "${snapshot}" == "${quarzion_root}/backups/"* && -d "${snapshot}/config" ]] || { echo "Usage: rollback-p0.sh /opt/quarzion/backups/<deploy-snapshot>" >&2; exit 2; }

cp -p "${snapshot}/config/docker-compose.yml" "${quarzion_root}/docker-compose.yml"
cp -p "${snapshot}/config/nginx.conf" "${quarzion_root}/nginx.conf"
cp -p "${snapshot}/config/.env" "${quarzion_root}/.env"
chmod 600 "${quarzion_root}/.env"

if [[ -f "${snapshot}/metadata/current-target.txt" ]]; then
  previous="$(cat "${snapshot}/metadata/current-target.txt")"
  if [[ -n "${previous}" && "${previous}" == "${quarzion_root}/releases/"* && -d "${previous}" ]]; then
    ln -sfn "${previous}" "${quarzion_root}/current"
  elif [[ -L "${quarzion_root}/current" ]]; then
    unlink "${quarzion_root}/current"
  fi
fi

cd "${quarzion_root}"
docker compose up -d --no-build
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload

if [[ -f "${snapshot}/metadata/timer-states.tsv" ]]; then
  while IFS=$'\t' read -r unit enabled active; do
    case "${unit}" in quarzion-backup.timer|quarzion-health.timer|quarzion-email-delivery.timer) ;; *) continue ;; esac
    if [[ "${enabled}" == "enabled" || "${enabled}" == "enabled-runtime" ]]; then systemctl enable "${unit}" >/dev/null 2>&1 || true; else systemctl disable "${unit}" >/dev/null 2>&1 || true; fi
    if [[ "${active}" == "active" || "${active}" == "activating" ]]; then systemctl start "${unit}" >/dev/null 2>&1 || true; else systemctl stop "${unit}" >/dev/null 2>&1 || true; fi
  done < "${snapshot}/metadata/timer-states.tsv"
else
  for unit in quarzion-email-delivery.timer quarzion-backup.timer quarzion-health.timer; do systemctl disable --now "${unit}" >/dev/null 2>&1 || true; done
fi

curl --fail --silent --show-error --max-time 20 https://windcall.cn/ >/dev/null
printf '{"event":"p0_rollback_completed","snapshot":"%s","time":"%s"}\n' "${snapshot}" "$(date -u +%FT%TZ)"
