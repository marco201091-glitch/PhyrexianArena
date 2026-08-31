\set ON_ERROR_STOP on
SET statement_timeout = '15s';
SET lock_timeout = '2s';
SET default_transaction_read_only = on;

SELECT current_database(), current_setting('server_version'), now();

SELECT conrelid::regclass AS table_name, attribute.attname AS fk_column
FROM pg_constraint AS constraint_row
JOIN pg_attribute AS attribute
  ON attribute.attrelid = constraint_row.conrelid
 AND attribute.attnum = ANY (constraint_row.conkey)
WHERE constraint_row.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index AS index_row
    WHERE index_row.indrelid = constraint_row.conrelid
      AND attribute.attnum = ANY (index_row.indkey)
  )
ORDER BY 1, 2;

SELECT schemaname, relname, seq_scan, idx_scan, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY seq_scan DESC, n_live_tup DESC
LIMIT 30;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT datname, usename, state, count(*) AS connections
FROM pg_stat_activity
GROUP BY datname, usename, state
ORDER BY connections DESC;

SELECT calls, round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms, rows, query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
