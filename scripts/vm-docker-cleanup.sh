#!/usr/bin/env bash
set -euo pipefail
trap 'logger -t phyrexian-docker-cleanup "failed at line $LINENO"' ERR

# Host-only maintenance. Never prune volumes: self-hosted Supabase data lives there.
exec 9>/run/lock/phyrexian-docker-cleanup.lock
flock -n 9 || exit 0

logger -t phyrexian-docker-cleanup 'start'
docker container prune -f
docker image prune -af
docker network prune -f
# Keep a short cache window for a same-day rollback/redeploy without retaining days of layers.
docker builder prune -af --filter 'until=12h'
journalctl --vacuum-time=7d
apt-get clean
logger -t phyrexian-docker-cleanup 'done'
