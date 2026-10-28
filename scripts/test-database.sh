#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# An isolated, disposable database; never uses a production DATABASE_URL.
container_name="gaadihisaab-tests-${RANDOM}-${RANDOM}"
docker run --detach --rm --name "$container_name" \
  -e POSTGRES_PASSWORD=local-test-only -e POSTGRES_DB=gaadihisaab_tests postgres:16-alpine >/dev/null
trap 'docker stop "$container_name" >/dev/null' EXIT
for attempt in {1..30}; do
  if docker exec "$container_name" pg_isready -U postgres -d gaadihisaab_tests >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$container_name" psql -U postgres -d gaadihisaab_tests -v ON_ERROR_STOP=1 < supabase/tests/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  docker exec -i "$container_name" psql -U postgres -d gaadihisaab_tests -v ON_ERROR_STOP=1 < "$migration"
done
docker exec -i "$container_name" psql -U postgres -d gaadihisaab_tests -v ON_ERROR_STOP=1 < supabase/tests/workspace.sql
docker exec -i "$container_name" psql -U postgres -d gaadihisaab_tests -v ON_ERROR_STOP=1 < supabase/tests/administration.sql
docker exec -i "$container_name" psql -U postgres -d gaadihisaab_tests -v ON_ERROR_STOP=1 < supabase/tests/push.sql
node scripts/test-database-concurrency.mjs "$container_name"
bash scripts/test-backup.sh "$container_name"
