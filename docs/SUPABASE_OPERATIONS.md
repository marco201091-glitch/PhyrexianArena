# Supabase self-hosted operations

## Compatibility boundary

Release 8.2 migrations are additive. The minimum supported client remains
8.1.0: do not drop or rename existing tables, columns, RPCs, Storage buckets,
or enum values while 8.1 is supported. Avatar UI and loading are removed from
8.2, but legacy avatar data is retained and still deleted with the account.

## Envoy gateway migration preflight

Supabase changed the default self-hosted API gateway from Kong to Envoy in
August 2026. This can break a Dokploy deployment when its compose, proxy, or
health checks depend on the `kong` service name, Kong's HTTPS listener, plugins,
or a custom `kong.yml`. It is not safe to replace the image in place.

Before upgrading:

1. Export the exact Dokploy compose and image digests; record the current
   Postgres major version and whether Studio uses `supabase_admin` or `postgres`.
2. Search the compose and Dokploy proxy configuration for `kong`, ports 8000,
   8443, custom plugins, and `API_EXTERNAL_URL`.
3. Take and verify encrypted database and Storage backups.
4. Start the proposed stack on an isolated hostname and copied non-production
   data. Do not attach it to production volumes.
5. Test `/auth/v1/health`, REST with anon and authenticated JWTs, Storage upload
   and download, Realtime subscribe/broadcast, CORS, forwarded client IP, rate
   limiting, and `/api/ready` through the public proxy.
6. Keep the previous compose and immutable image digests as rollback. Switch
   traffic only after all checks pass; never attempt a Postgres 15-to-17 upgrade
   as part of the same change.

Kong can remain explicitly pinned during this validation. Envoy should be
adopted only after Dokploy routing no longer depends on Kong-specific behavior.

The production compose pins every service to an exact image tag
(`kong/kong:3.9.1`, `supabase/postgres:17.6.1.136`, `supabase/storage-api:v1.60.4`,
…), and the weekly `/opt/scripts/supabase-update.sh` only re-pulls those same
pinned tags. The gateway therefore cannot switch to Envoy on its own: adopting
it requires an explicit tag change in addition to the validation above. That
script also force-recreates the whole production stack every Sunday at 01:00
UTC, which is a planned weekly restart and shows up as a short uptime on the
containers — not an incident.

## Production backup

Backups run on the VM and stay on the VM. **There is no off-site copy**: losing
the VM loses the backups with it. This protects against accidental data loss (a
bad migration, a wrong delete), not against host or provider failure. Treat the
absence of an off-site destination as an open risk, not as a design choice.

`/etc/cron.d/supabase-backup` runs `ops/supabase-backup.sh` daily at 03:00 UTC
as root. Each run writes one dated directory under `/var/backups/phyrexianarena`
containing:

- `database.dump` — `pg_dump --format=custom` of the whole cluster, taken inside
  the `supabase-db` container as `supabase_admin`. That role is the cluster
  superuser; with `postgres` the dump misses the schemas owned by
  `supabase_admin`. It authenticates on the container's local socket, so no
  database password exists in the script or in any environment file.
- `storage.tar.gz` — the Storage volume.
- `SHA256SUMS` — checksums of both archives.
- `manifest.json` — name, timestamp, size, retention.

The directory is published atomically and `/var/backups/phyrexianarena/last-success`
is refreshed only after that. Retention keeps the 7 most recent complete
backups. A run that fails part-way never appears as a complete backup and never
refreshes the marker.

`ops/vm-health-alert.sh` (cron, every 5 minutes) warns when the marker is
missing or older than `BACKUP_MAX_AGE_HOURS` (default 30). It also covers disk
usage, container health and the public endpoints, and notifies once per state
change — not once per run — through the webhook, or by email when no webhook is
configured. A failing backup also emails directly from `ops/supabase-backup.sh`.

Alert credentials live in `/etc/phyrexian-health-alert.env` (0600 root) and are
never stored in the scripts.

Restore drill, verified 2026-09-15: restoring the newest dump into a temporary
database reproduced all 73 tables across `public`, `auth`, `storage`,
`realtime` and `supabase_functions` with identical row counts and no
`pg_restore` errors. Repeat into an isolated database at least quarterly.

## Read-only database review

Run `scripts/qa/supabase-runtime-audit.sql` through `psql` with a read-only
administrative session. Review missing foreign-key indexes, large sequential
scans, RLS expressions, table bloat, connections, and the most expensive
`pg_stat_statements` entries before creating any performance migration.
