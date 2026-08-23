#!/usr/bin/env bash
set -euo pipefail

site_root=/srv/unumae-site
site_user=unumae-site
artifact=${1:-}
release=${2:-$(date -u +%Y%m%dT%H%M%SZ)}

if [[ ${EUID} -ne 0 ]]; then
  printf 'Run this release installer as root.\n' >&2
  exit 1
fi
if [[ -z "${artifact}" || ! -d "${artifact}" ]]; then
  printf 'Usage: %s /absolute/path/to/dist [release-id]\n' "${0}" >&2
  exit 1
fi
if [[ ! "${release}" =~ ^[A-Za-z0-9._-]{1,80}$ ]]; then
  printf 'Invalid release id: %s\n' "${release}" >&2
  exit 1
fi

artifact=$(realpath "${artifact}")
for required in index.html healthz .well-known/apple-app-site-association; do
  if [[ ! -f "${artifact}/${required}" ]]; then
    printf 'Release is missing %s\n' "${required}" >&2
    exit 1
  fi
done

target="${site_root}/releases/${release}"
if [[ -e "${target}" ]]; then
  printf 'Release already exists: %s\n' "${target}" >&2
  exit 1
fi

install -d -m 0755 -o "${site_user}" -g "${site_user}" "${target}"
cp -a "${artifact}/." "${target}/"
chown -R "${site_user}:${site_user}" "${target}"
find "${target}" -type d -exec chmod 0755 {} +
find "${target}" -type f -exec chmod 0644 {} +

current_target=
if [[ -L "${site_root}/current" ]]; then
  current_target=$(readlink "${site_root}/current")
fi

next_link="${site_root}/.current-next.$$"
ln -s "releases/${release}" "${next_link}"
mv -Tf "${next_link}" "${site_root}/current"

if [[ -n "${current_target}" ]]; then
  previous_link="${site_root}/.previous-next.$$"
  ln -s "${current_target}" "${previous_link}"
  mv -Tf "${previous_link}" "${site_root}/previous"
fi

if [[ "${SKIP_HEALTH_CHECK:-0}" != "1" ]] &&
  ! /usr/local/libexec/unumae-site-health; then
  if [[ -n "${current_target}" ]]; then
    restore_link="${site_root}/.current-restore.$$"
    ln -s "${current_target}" "${restore_link}"
    mv -Tf "${restore_link}" "${site_root}/current"
  fi
  printf 'Health check failed; restored the prior release.\n' >&2
  exit 1
fi

printf 'Activated Unumae release %s\n' "${release}"
