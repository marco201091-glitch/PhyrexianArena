# Dev Supabase backup and restore drill

These commands target only the `supabase-dev` Compose stack. Production is not an accepted target.

1. Set `SELFHOSTED_DEV_VM_HOST`, `SELFHOSTED_DEV_VM_USER`, `SELFHOSTED_DEV_VM_KEY_PATH` and optionally `SELFHOSTED_DEV_COMPOSE_PROJECT`.
2. Run `npm run backup:dev-db -- <output-directory>`.
3. Run `npm run verify:dev-db-backup -- <backup.dump>` to verify both the database dump and the paired Storage archive.
4. Run `npm run restore-drill:dev-db -- <backup.dump>`. The script restores into a uniquely named temporary database inside the Dev database container, checks table and RLS counts, and removes the temporary database in a `finally` block.
5. Never point these scripts at production or restore over the live `postgres` database.

Backups contain user data. Store them encrypted outside the repository and apply a documented retention policy. The `backups/` directory is ignored by Git.
