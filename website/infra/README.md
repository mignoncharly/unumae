# Isolated production deployment

The Unumae website is a dedicated static Nginx vhost. It uses the host's Nginx
ingress process, while its account, configuration, content, logs, certificate
state, monitoring, renewal, and release lifecycle are isolated from every
other application.

| Boundary                 | Unumae-owned value                          |
| ------------------------ | ------------------------------------------- |
| Unix account             | `unumae-site`                               |
| Releases                 | `/srv/unumae-site/releases`                 |
| Active/rollback links    | `/srv/unumae-site/current`, `previous`      |
| Nginx site               | `/etc/nginx/sites-available/unumae-site`    |
| Logs                     | `/var/log/nginx/unumae-site.*.log`          |
| ACME webroot             | `/srv/unumae-site/acme`                     |
| Certbot config/work/logs | `/srv/unumae-site/certbot/*`                |
| Certificate name         | `unumae-site`                               |
| systemd monitoring       | `unumae-site-health.{service,timer}`        |
| systemd renewal          | `unumae-site-certbot-renew.{service,timer}` |

No upstream port, database credential, web root, certificate directory,
service, or log belonging to an existing application is referenced.

## First launch

DNS for both names must point to this host. Build and qualify the release as the
normal repository user:

```bash
npm --prefix website ci
npm run web:quality
npm run web:build
```

`website/.env.production` supplies the build-time public values and remains
gitignored. Then bootstrap the isolated host once:

```bash
sudo CERTBOT_EMAIL=operator@example.com \
  website/infra/scripts/bootstrap-host.sh \
  /home/mignon/apps/unumae/website/dist
```

That command creates the dedicated account and paths, installs an HTTP-only
ACME vhost, activates the first static release, obtains a certificate for both
names using Unumae's private Certbot directories, installs the HTTPS vhost, and
enables the health and renewal timers. It refuses existing unexpected Nginx
targets and runs `nginx -t` before every reload.

The canonical origin is `https://unumae.app`; HTTP and
`https://www.unumae.app` redirect there in one permanent hop.

The first launch completed on 23 August 2026. The certificate covers both
names, the initial health check passed, and the health and renewal timers are
enabled. The health service is a oneshot, so `inactive (dead)` between
successful timer runs is normal.

## Later releases and rollback

Build first, then install an immutable release identified by the Git commit:

```bash
sudo website/infra/scripts/deploy-release.sh \
  /home/mignon/apps/unumae/website/dist \
  "$(git rev-parse --short HEAD)"
```

Activation is an atomic symlink move. A failed HTTPS health check restores the
prior release automatically. No old release is deleted automatically.

```bash
sudo website/infra/scripts/rollback.sh
node website/infra/scripts/smoke-production.mjs
```

Inspect monitoring and dedicated logs with:

```bash
systemctl status unumae-site-health.timer unumae-site-certbot-renew.timer
journalctl -u unumae-site-health.service
tail -f /var/log/nginx/unumae-site.error.log
```

The host-level Certbot timer cannot see this certificate because its
`--config-dir` is private to Unumae; only the dedicated renewal unit manages
it.
