#!/usr/bin/env bash
set -euo pipefail

backup_root=${SUPABASE_BACKUP_ROOT:-/var/backups/phyrexianarena}
compose_project=${SUPABASE_COMPOSE_PROJECT:?SUPABASE_COMPOSE_PROJECT is required}
age_recipient=${SUPABASE_BACKUP_AGE_RECIPIENT:?SUPABASE_BACKUP_AGE_RECIPIENT is required}
rclone_remote=${SUPABASE_BACKUP_RCLONE_REMOTE:?SUPABASE_BACKUP_RCLONE_REMOTE is required}
retention_days=${SUPABASE_BACKUP_LOCAL_RETENTION_DAYS:-7}

install -d -m 0700 "$backup_root"
work_dir=$(mktemp -d "$backup_root/.tmp.XXXXXX")
cleanup() {
  case "$work_dir" in
    "$backup_root"/.tmp.*) find "$work_dir" -depth -delete 2>/dev/null || true ;;
  esac
}
trap cleanup EXIT

db_container=$(docker ps -q \
  --filter "label=com.docker.compose.project=$compose_project" \
  --filter 'label=com.docker.compose.service=db' | head -n 1)
storage_container=$(docker ps -q \
  --filter "label=com.docker.compose.project=$compose_project" \
  --filter 'label=com.docker.compose.service=storage' | head -n 1)
test -n "$db_container"
test -n "$storage_container"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="supabase-production-$stamp"
docker exec "$db_container" pg_dump -U supabase_admin -d postgres \
  --format=custom --no-owner --no-privileges > "$work_dir/$name.dump"
docker exec "$storage_container" tar -C /var/lib/storage -czf - . > "$work_dir/$name.storage.tar.gz"

for source in "$work_dir/$name.dump" "$work_dir/$name.storage.tar.gz"; do
  age --recipient "$age_recipient" --output "$source.age" "$source"
  sha256sum "$source.age" > "$source.age.sha256"
  rm -- "$source"
done

printf '{"createdAt":"%s","composeProject":"%s","database":"%s.dump.age","storage":"%s.storage.tar.gz.age"}\n' \
  "$stamp" "$compose_project" "$name" "$name" > "$work_dir/$name.manifest.json"

rclone copy "$work_dir" "$rclone_remote/$name" --immutable --checkers 4 --transfers 2
install -m 0600 "$work_dir/$name.manifest.json" "$backup_root/$name.manifest.json"
date -u +%s > "$backup_root/last-success"
find "$backup_root" -maxdepth 1 -type f -name 'supabase-production-*.manifest.json' \
  -mtime "+$retention_days" -delete

echo "Encrypted database and Storage backup uploaded: $name"
