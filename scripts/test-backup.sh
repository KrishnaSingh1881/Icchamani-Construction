#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container_name="$1"
backup_test_dir=$(mktemp -d)
trap 'rm -rf "$backup_test_dir"' EXIT
export BACKUP_ENCRYPTION_KEY='local-only-recovery-test-key-32-characters-minimum'
docker exec "$container_name" pg_dump -U postgres -d gaadihisaab_tests --format=custom --no-owner --schema=public --schema=app_private > "$backup_test_dir/workspace.dump"
node scripts/backup-crypto.mjs encrypt "$backup_test_dir/workspace.dump" "$backup_test_dir/workspace.ghbackup"
node scripts/backup-crypto.mjs decrypt "$backup_test_dir/workspace.ghbackup" "$backup_test_dir/restored.dump"
cmp "$backup_test_dir/workspace.dump" "$backup_test_dir/restored.dump"
docker exec "$container_name" createdb -U postgres gaadihisaab_restore_check
docker exec -i "$container_name" psql -U postgres -d gaadihisaab_restore_check -v ON_ERROR_STOP=1 < supabase/tests/bootstrap.sql
docker exec -i "$container_name" pg_restore -U postgres -d gaadihisaab_restore_check --clean --if-exists --no-owner --exit-on-error < "$backup_test_dir/restored.dump"
original_count=$(docker exec "$container_name" psql -U postgres -d gaadihisaab_tests -Atc 'select count(*) from public.business_records')
restored_count=$(docker exec "$container_name" psql -U postgres -d gaadihisaab_restore_check -Atc 'select count(*) from public.business_records')
test "$original_count" = "$restored_count"
BACKUP_ENCRYPTION_KEY='a-different-local-test-key-that-is-long-enough' node scripts/backup-crypto.mjs decrypt "$backup_test_dir/workspace.ghbackup" "$backup_test_dir/wrong-key.dump" >/dev/null 2>&1 && { printf 'Incorrect key was accepted\n';exit 1; }
test ! -e "$backup_test_dir/wrong-key.dump"
printf 'Encrypted backup round-trip and isolated database restore passed. Wrong keys leave no partial dump.\n'
