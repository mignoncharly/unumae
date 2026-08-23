#!/usr/bin/env bash
set -euo pipefail

body=$(
  /usr/bin/curl \
    --fail \
    --silent \
    --show-error \
    --max-time 15 \
    --proto '=https' \
    --resolve unumae.app:443:127.0.0.1 \
    https://unumae.app/healthz
)

if [[ "${body}" != "ok" ]]; then
  printf 'Unexpected Unumae health response: %s\n' "${body}" >&2
  exit 1
fi
