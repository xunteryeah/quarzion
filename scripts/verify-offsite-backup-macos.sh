#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
umask 077

support_root="${QUARZION_OFFSITE_SUPPORT_ROOT:-${HOME}/Library/Application Support/Quarzion}"
backup_root="${QUARZION_OFFSITE_LOCAL_DIR:-${support_root}/offsite-backups}"
key_file="${QUARZION_OFFSITE_KEY_FILE:-${support_root}/offsite-backup.key}"
archive="${1:-}"

if [[ -z "${archive}" ]]; then
  archive="$(find "${backup_root}" -maxdepth 1 -type f -name '*-p0-production.tar.enc' -print | sort | tail -1)"
fi
[[ -f "${archive}" ]] || { echo "No encrypted offsite backup found" >&2; exit 2; }
[[ -s "${key_file}" ]] || { echo "Offsite backup key is missing" >&2; exit 2; }
[[ -f "${archive}.sha256" ]] || { echo "Encrypted archive checksum is missing" >&2; exit 2; }

(cd "$(dirname "${archive}")" && shasum -a 256 -c "$(basename "${archive}.sha256")" >/dev/null)

verify_root="$(mktemp -d "${TMPDIR:-/tmp}/quarzion-offsite-verify.XXXXXX")"
cleanup() { rm -rf -- "${verify_root}"; }
trap cleanup EXIT

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
  -pass "file:${key_file}" -in "${archive}" \
  | tar -xf - -C "${verify_root}"

backup_dir="$(find "${verify_root}" -mindepth 1 -maxdepth 1 -type d -name '*-p0-production' -print | head -1)"
[[ -n "${backup_dir}" && -f "${backup_dir}/SHA256SUMS" ]] || { echo "Backup manifest is missing" >&2; exit 1; }

(cd "${backup_dir}" && shasum -a 256 -c SHA256SUMS >/dev/null)
for database in "${backup_dir}"/databases/*.sqlite; do
  [[ -f "${database}" ]] || continue
  sqlite3 "${database}" 'PRAGMA integrity_check;' | grep -qx 'ok'
done

printf '{"level":"info","event":"offsite_restore_verification_passed","archive":"%s","time":"%s"}\n' \
  "${archive}" "$(date -u +%FT%TZ)"
