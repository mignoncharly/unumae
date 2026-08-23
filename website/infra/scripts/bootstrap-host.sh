#!/usr/bin/env bash
set -euo pipefail

infra_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
artifact=${1:-}
email=${CERTBOT_EMAIL:-}
site_root=/srv/unumae-site
site_user=unumae-site
nginx_available=/etc/nginx/sites-available/unumae-site
nginx_enabled=/etc/nginx/sites-enabled/unumae-site

if [[ ${EUID} -ne 0 ]]; then
  printf 'Run bootstrap as root.\n' >&2
  exit 1
fi
if [[ -z "${artifact}" || ! -d "${artifact}" || -z "${email}" ]]; then
  printf 'Usage: sudo CERTBOT_EMAIL=you@example.com %s /absolute/path/to/dist\n' "${0}" >&2
  exit 1
fi
for command in certbot curl getent nginx systemctl useradd; do
  command -v "${command}" >/dev/null || {
    printf 'Missing required command: %s\n' "${command}" >&2
    exit 1
  }
done

if ! getent passwd "${site_user}" >/dev/null; then
  useradd \
    --system \
    --user-group \
    --home-dir "${site_root}" \
    --create-home \
    --shell /usr/sbin/nologin \
    "${site_user}"
fi

install -d -m 0755 -o "${site_user}" -g "${site_user}" \
  "${site_root}" "${site_root}/releases"
install -d -m 0755 -o root -g root \
  "${site_root}/acme" "${site_root}/acme/.well-known" \
  "${site_root}/acme/.well-known/acme-challenge"
install -d -m 0700 -o root -g root \
  "${site_root}/certbot" "${site_root}/certbot/config" \
  "${site_root}/certbot/work" "${site_root}/certbot/logs"
install -d -m 0755 -o root -g root /usr/local/libexec

install -m 0755 "${infra_dir}/scripts/health-check.sh" \
  /usr/local/libexec/unumae-site-health
install -m 0700 "${infra_dir}/scripts/certbot-renew.sh" \
  /usr/local/libexec/unumae-site-certbot-renew
install -m 0644 "${infra_dir}/systemd/unumae-site-health.service" \
  /etc/systemd/system/unumae-site-health.service
install -m 0644 "${infra_dir}/systemd/unumae-site-health.timer" \
  /etc/systemd/system/unumae-site-health.timer
install -m 0644 "${infra_dir}/systemd/unumae-site-certbot-renew.service" \
  /etc/systemd/system/unumae-site-certbot-renew.service
install -m 0644 "${infra_dir}/systemd/unumae-site-certbot-renew.timer" \
  /etc/systemd/system/unumae-site-certbot-renew.timer
install -m 0644 "${infra_dir}/nginx/security-headers.conf" \
  /etc/nginx/snippets/unumae-site-security.conf
install -m 0644 "${infra_dir}/nginx/unumae-site.bootstrap.conf" \
  "${nginx_available}"

if [[ -e "${nginx_enabled}" && ! -L "${nginx_enabled}" ]]; then
  printf 'Refusing non-symlink Nginx target: %s\n' "${nginx_enabled}" >&2
  exit 1
fi
if [[ -L "${nginx_enabled}" ]] &&
  [[ $(readlink "${nginx_enabled}") != "${nginx_available}" ]]; then
  printf 'Refusing unexpected Nginx symlink target.\n' >&2
  exit 1
fi
if [[ ! -e "${nginx_enabled}" ]]; then
  ln -s "${nginx_available}" "${nginx_enabled}"
fi

SKIP_HEALTH_CHECK=1 "${infra_dir}/scripts/deploy-release.sh" \
  "${artifact}" "bootstrap-$(date -u +%Y%m%dT%H%M%SZ)"

nginx -t
systemctl reload nginx

certbot certonly \
  --non-interactive \
  --agree-tos \
  --no-eff-email \
  --email "${email}" \
  --cert-name unumae-site \
  --webroot \
  --webroot-path "${site_root}/acme" \
  --domain unumae.app \
  --domain www.unumae.app \
  --config-dir "${site_root}/certbot/config" \
  --work-dir "${site_root}/certbot/work" \
  --logs-dir "${site_root}/certbot/logs"

install -m 0644 "${infra_dir}/nginx/unumae-site.conf" "${nginx_available}"
nginx -t
systemctl reload nginx
systemctl daemon-reload
systemctl enable --now \
  unumae-site-health.timer \
  unumae-site-certbot-renew.timer
systemctl start unumae-site-health.service

printf 'Unumae host bootstrap complete.\n'
