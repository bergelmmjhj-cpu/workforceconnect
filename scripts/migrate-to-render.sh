#!/bin/bash
# WFConnect Data Migration: Replit PostgreSQL → Render PostgreSQL
# Usage: bash scripts/migrate-to-render.sh "postgresql://user:password@host/dbname"

set -e

RENDER_URL="$1"

if [ -z "$RENDER_URL" ]; then
  echo "ERROR: Please provide the Render external database URL as an argument."
  echo ""
  echo "Usage: bash scripts/migrate-to-render.sh \"postgresql://user:password@host/dbname\""
  echo ""
  echo "Get this URL from Render:"
  echo "  1. Go to render.com → your 'wfconnect-db' database"
  echo "  2. Click 'Connect' → copy the 'External Database URL'"
  exit 1
fi

echo "=== WFConnect Data Migration ==="
echo "Source: Replit PostgreSQL (local)"
echo "Target: Render PostgreSQL"
echo ""
echo "Step 1: Dumping data from Replit..."
pg_dump "$DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  --no-privileges \
  --disable-triggers \
  --format=plain \
  > /tmp/wfconnect_dump.sql

echo "Dump complete. File size: $(wc -l < /tmp/wfconnect_dump.sql) lines"
echo ""
echo "Step 2: Restoring data to Render..."
psql "$RENDER_URL" \
  --set ON_ERROR_STOP=off \
  --quiet \
  < /tmp/wfconnect_dump.sql

echo ""
echo "Step 3: Resetting sequences so new records get correct IDs..."
psql "$RENDER_URL" --quiet --tuples-only -c "
SELECT 'SELECT setval(' || quote_literal(sequence_namespace.nspname || '.' || sequence_class.relname) || ', COALESCE((SELECT MAX(id) FROM ' || table_class.relname || '), 1), true);'
FROM pg_class AS sequence_class
JOIN pg_namespace AS sequence_namespace ON sequence_class.relnamespace = sequence_namespace.oid
JOIN pg_depend ON pg_depend.objid = sequence_class.oid
JOIN pg_class AS table_class ON table_class.oid = pg_depend.refobjid
WHERE sequence_class.relkind = 'S'
  AND sequence_namespace.nspname = 'public';
" | psql "$RENDER_URL" --quiet

echo ""
echo "Step 4: Verifying migration..."
echo -n "Users: "
psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM users;"
echo -n "Shifts: "
psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM shifts;"
echo -n "Workplaces: "
psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM workplaces;"
echo -n "Timesheets: "
psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM timesheets;"

echo ""
echo "=== Migration Complete! ==="
echo "Your data is now on Render. You can log in with your existing credentials."

# Cleanup
rm -f /tmp/wfconnect_dump.sql
