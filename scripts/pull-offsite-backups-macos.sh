#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
umask 077

ssh_host="${QUARZION_OFFSITE_SSH_HOST:-furo}"
remote_root="${QUARZION_OFFSITE_REMOTE_ROOT:-/opt/quarzion/backups}"
support_root="${QUARZION_OFFSITE_SUPPORT_ROOT:-${HOME}/Library/Application Support/Quarzion}"
backup_root="${QUARZION_OFFSITE_LOCAL_DIR:-${support_root}/offsite-backups}"
key_file="${QUARZION_OFFSITE_KEY_FILE:-${support_root}/offsite-backup.key}"
lock_dir="${support_root}/.offsite-backup.lock"

case "${support_root}" in
  "${HOME}/Library/Application Support/Quarzion"|"${HOME}/Library/Application Support/Quarzion/"*) ;;
  *) echo "Refusing unsafe support directory: ${support_root}" >&2; exit 2 ;;
esac

mkdir -p "${support_root}" "${backup_root}"
chmod 700 "${support_root}" "${backup_root}"

if ! mkdir "${lock_dir}" 2>/dev/null; then
  printf '{"level":"warning","event":"offsite_backup_skipped","reason":"already_running","time":"%s"}\n' "$(date -u +%FT%TZ)"
  exit 0
fi
cleanup() { rmdir "${lock_dir}" 2>/dev/null || true; }
trap cleanup EXIT

if [[ ! -s "${key_file}" ]]; then
  openssl rand -hex 32 > "${key_file}"
  chmod 600 "${key_file}"
fi

mapfile_cmd="find '${remote_root}' -mindepth 1 -maxdepth 1 -type d -name '*-p0-production' -printf '%f\\n' | sort"
remote_names="$({ ssh -o BatchMode=yes -o ConnectTimeout=15 "${ssh_host}" "${mapfile_cmd}"; } 2>&1)" || {
  printf '{"level":"error","event":"offsite_backup_list_failed","time":"%s"}\n' "$(date -u +%FT%TZ)" >&2
  printf '%s\n' "${remote_names}" >&2
  exit 1
}

# A daily disaster-recovery copy should prioritize the newest complete backup.
# Set QUARZION_OFFSITE_COPY_ALL=1 only when intentionally backfilling history.
if [[ "${QUARZION_OFFSITE_COPY_ALL:-0}" != "1" ]]; then
  remote_names="$(printf '%s\n' "${remote_names}" | grep -E '^[0-9]{8}T[0-9]{6}Z-p0-production$' | tail -1)"
fi

copied=0
while IFS= read -r backup_name; do
  [[ -n "${backup_name}" ]] || continue
  [[ "${backup_name}" =~ ^[0-9]{8}T[0-9]{6}Z-p0-production$ ]] || {
    echo "Skipping unexpected remote backup name: ${backup_name}" >&2
    continue
  }

  archive="${backup_root}/${backup_name}.tar.enc"
  checksum="${archive}.sha256"
  [[ -s "${archive}" && -s "${checksum}" ]] && continue

  partial="${archive}.part"
  rm -f -- "${partial}"
  ssh -o BatchMode=yes -o ConnectTimeout=15 "${ssh_host}" \
    "tar -C '${remote_root}' -cf - '${backup_name}'" \
    | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -md sha256 \
        -pass "file:${key_file}" -out "${partial}"

  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
    -pass "file:${key_file}" -in "${partial}" \
    | tar -tf - >/dev/null

  mv "${partial}" "${archive}"
  shasum -a 256 "${archive}" > "${checksum}"
  chmod 600 "${archive}" "${checksum}"
  copied=$((copied + 1))
done <<< "${remote_names}"

latest_remote="$(printf '%s\n' "${remote_names}" | grep -E '^[0-9]{8}T[0-9]{6}Z-p0-production$' | tail -1)"
if [[ -n "${latest_remote}" && -s "${backup_root}/${latest_remote}.tar.enc" && -s "${backup_root}/${latest_remote}.tar.enc.sha256" ]]; then
  acknowledged_at="$(date -u +%FT%TZ)"
  ssh -o BatchMode=yes -o ConnectTimeout=15 "${ssh_host}" \
    "umask 077; printf '%s\\n' 'backup=${latest_remote}' 'copied_at=${acknowledged_at}' > /opt/quarzion/.offsite-backup-ack.tmp && mv /opt/quarzion/.offsite-backup-ack.tmp /opt/quarzion/.offsite-backup-ack"
fi

printf '{"level":"info","event":"offsite_backup_completed","copied":%d,"target":"%s","time":"%s"}\n' \
  "${copied}" "${backup_root}" "$(date -u +%FT%TZ)"
