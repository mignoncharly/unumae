#!/usr/bin/env bash
set -euo pipefail

exec /usr/bin/certbot renew \
  --non-interactive \
  --quiet \
  --cert-name unumae-site \
  --config-dir /srv/unumae-site/certbot/config \
  --work-dir /srv/unumae-site/certbot/work \
  --logs-dir /srv/unumae-site/certbot/logs \
  --deploy-hook '/usr/bin/systemctl reload nginx'
