#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?Supply the trusted PostgreSQL connection URL through an environment secret}"
: "${BACKUP_ENCRYPTION_KEY:?Supply an independent backup encryption key through an environment secret}"
backup_output_dir="${BACKUP_OUTPUT_DIR:-backups}"
mkdir -p "$backup_output_dir"
backup_temp_dir=$(mktemp -d)
backup_finish() {
  backup_exit_status=$?
  if [ "$backup_exit_status" -ne 0 ]; then
    psql "$DATABASE_URL" -Xq -v ON_ERROR_STOP=1 -c "select public.record_backup_result(false,'export-failed',0)" >/dev/null 2>&1 || true
  fi
  rm -rf "$backup_temp_dir"
}
trap backup_finish EXIT
# PGDATABASE avoids exposing the connection password in process arguments.
pg_dump "$DATABASE_URL" --format=custom --no-owner --schema=public --schema=app_private --file="$backup_temp_dir/workspace.dump"
backup_output="$backup_output_dir/gaadihisaab-$(date -u +%Y%m%dT%H%M%SZ).ghbackup"
node scripts/backup-crypto.mjs encrypt "$backup_temp_dir/workspace.dump" "$backup_output"
printf 'Encrypted backup created: %s\n' "$backup_output"

backup_filename=$(basename "$backup_output")
backup_size=$(wc -c < "$backup_output")
psql "$DATABASE_URL" -Xq -v ON_ERROR_STOP=1 --set=backup_name="$backup_filename" --set=backup_size="$backup_size" <<'SQL'
select public.record_backup_result(true,:'backup_name',:'backup_size'::bigint);
SQL
