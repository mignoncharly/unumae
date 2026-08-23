#!/usr/bin/env bash
set -euo pipefail

site_root=/srv/unumae-site

if [[ ${EUID} -ne 0 ]]; then
  printf 'Run rollback as root.\n' >&2
  exit 1
fi
if [[ ! -L "${site_root}/current" || ! -L "${site_root}/previous" ]]; then
  printf 'Both current and previous releases are required.\n' >&2
  exit 1
fi

current_target=$(readlink "${site_root}/current")
previous_target=$(readlink "${site_root}/previous")
if [[ ! "${current_target}" =~ ^releases/ || ! "${previous_target}" =~ ^releases/ ]]; then
  printf 'Refusing unexpected release symlink targets.\n' >&2
  exit 1
fi

next_link="${site_root}/.rollback-next.$$"
ln -s "${previous_target}" "${next_link}"
mv -Tf "${next_link}" "${site_root}/current"

if ! /usr/local/libexec/unumae-site-health; then
  restore_link="${site_root}/.rollback-restore.$$"
  ln -s "${current_target}" "${restore_link}"
  mv -Tf "${restore_link}" "${site_root}/current"
  printf 'Rollback target failed health; restored %s.\n' "${current_target}" >&2
  exit 1
fi

previous_link="${site_root}/.previous-next.$$"
ln -s "${current_target}" "${previous_link}"
mv -Tf "${previous_link}" "${site_root}/previous"
printf 'Rolled back Unumae from %s to %s.\n' "${current_target}" "${previous_target}"
