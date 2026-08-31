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

## Production backup

`ops/supabase-backup.sh` creates PostgreSQL custom-format and Storage archives,
encrypts each with `age`, writes SHA-256 checksums, and uploads them to an
immutable rclone destination. Install the service and timer only after setting:

- `SUPABASE_COMPOSE_PROJECT`
- `SUPABASE_BACKUP_AGE_RECIPIENT`
- `SUPABASE_BACKUP_RCLONE_REMOTE`
- optional retention and backup-root variables

The private age key must live off the VM. Test a restore into an isolated
database quarterly and record RPO/RTO evidence. The health alert treats a
missing or older-than-30-hour success marker as a failure.

## Read-only database review

Run `scripts/qa/supabase-runtime-audit.sql` through `psql` with a read-only
administrative session. Review missing foreign-key indexes, large sequential
scans, RLS expressions, table bloat, connections, and the most expensive
`pg_stat_statements` entries before creating any performance migration.
