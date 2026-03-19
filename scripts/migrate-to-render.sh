#!/bin/bash
# WFConnect Data Migration: Replit PostgreSQL → Render PostgreSQL (CLEAN)
# This script wipes Render's existing data, then restores everything fresh from Replit
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

echo "=========================================="
echo "WFConnect Data Migration (CLEAN)"
echo "=========================================="
echo "Source: Replit PostgreSQL (local)"
echo "Target: Render PostgreSQL (will be wiped)"
echo ""

echo "Step 1: Dumping complete data from Replit..."
pg_dump "$DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  --no-privileges \
  --disable-triggers \
  --format=plain \
  > /tmp/wfconnect_fresh.sql

DUMP_LINES=$(wc -l < /tmp/wfconnect_fresh.sql)
echo "✓ Dump complete. $DUMP_LINES lines"
echo ""

echo "Step 2: Wiping Render database (clean slate)..."
psql "$RENDER_URL" --quiet <<'EOF'
-- Truncate all tables in FK-safe order (children before parents)
-- TRUNCATE ... CASCADE handles all constraints automatically
TRUNCATE TABLE 
  tito_corrections,
  tito_logs,
  shift_checkins,
  timesheet_entries,
  timesheets,
  payroll_batch_items,
  payroll_batches,
  shift_offers,
  shift_requests,
  recurrence_exceptions,
  shifts,
  shift_series,
  workplace_assignments,
  workplaces,
  worker_applications,
  app_notifications,
  push_tokens,
  conversations,
  messages,
  message_logs,
  clawd_chat_messages,
  clawd_assistant_runs,
  payment_profiles,
  user_photos,
  export_audit_logs,
  audit_log,
  discord_alerts,
  discord_action_logs,
  ai_action_logs,
  ai_alert_state,
  ai_message_log,
  crm_push_queue,
  crm_sync_logs,
  sms_logs,
  sent_reminders,
  contact_leads,
  appointments,
  applicants,
  app_config,
  users
CASCADE;
EOF

echo "✓ Render database wiped"
echo ""

echo "Step 3: Restoring fresh data from Replit to Render..."
psql "$RENDER_URL" \
  --set ON_ERROR_STOP=on \
  --quiet \
  < /tmp/wfconnect_fresh.sql

echo "✓ Data restored"
echo ""

echo "Step 4: Resetting sequences for new record IDs..."
psql "$RENDER_URL" --quiet --tuples-only -c "
SELECT 'SELECT setval(' || quote_literal(sequence_namespace.nspname || '.' || sequence_class.relname) || ', COALESCE((SELECT MAX(id) FROM ' || table_class.relname || '), 1), true);'
FROM pg_class AS sequence_class
JOIN pg_namespace AS sequence_namespace ON sequence_class.relnamespace = sequence_namespace.oid
JOIN pg_depend ON pg_depend.objid = sequence_class.oid
JOIN pg_class AS table_class ON table_class.oid = pg_depend.refobjid
WHERE sequence_class.relkind = 'S'
  AND sequence_namespace.nspname = 'public';
" | psql "$RENDER_URL" --quiet

echo "✓ Sequences reset"
echo ""

echo "Step 5: Verifying migration..."
echo ""

REPLIT_USERS=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM users;")
RENDER_USERS=$(psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM users;")
echo "Users:        Replit=$REPLIT_USERS  Render=$RENDER_USERS $([ "$REPLIT_USERS" = "$RENDER_USERS" ] && echo "✓" || echo "✗ MISMATCH")"

REPLIT_SHIFTS=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM shifts;")
RENDER_SHIFTS=$(psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM shifts;")
echo "Shifts:       Replit=$REPLIT_SHIFTS  Render=$RENDER_SHIFTS $([ "$REPLIT_SHIFTS" = "$RENDER_SHIFTS" ] && echo "✓" || echo "✗ MISMATCH")"

REPLIT_WP=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM workplaces;")
RENDER_WP=$(psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM workplaces;")
echo "Workplaces:   Replit=$REPLIT_WP  Render=$RENDER_WP $([ "$REPLIT_WP" = "$RENDER_WP" ] && echo "✓" || echo "✗ MISMATCH")"

REPLIT_APPL=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM applicants;")
RENDER_APPL=$(psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM applicants;")
echo "Applicants:   Replit=$REPLIT_APPL  Render=$RENDER_APPL $([ "$REPLIT_APPL" = "$RENDER_APPL" ] && echo "✓" || echo "✗ MISMATCH")"

REPLIT_WA=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM worker_applications;")
RENDER_WA=$(psql "$RENDER_URL" --tuples-only --no-align -c "SELECT COUNT(*) FROM worker_applications;")
echo "WorkerApps:   Replit=$REPLIT_WA  Render=$RENDER_WA $([ "$REPLIT_WA" = "$RENDER_WA" ] && echo "✓" || echo "✗ MISMATCH")"

echo ""

if [ "$REPLIT_USERS" = "$RENDER_USERS" ] && [ "$REPLIT_SHIFTS" = "$RENDER_SHIFTS" ] && [ "$REPLIT_WP" = "$RENDER_WP" ] && [ "$REPLIT_APPL" = "$RENDER_APPL" ] && [ "$REPLIT_WA" = "$RENDER_WA" ]; then
  echo "=========================================="
  echo "✅ MIGRATION SUCCESSFUL!"
  echo "=========================================="
  echo "All data now on Render. Counts match perfectly."
else
  echo "=========================================="
  echo "⚠️  MIGRATION INCOMPLETE"
  echo "=========================================="
  echo "Some counts don't match. Check errors above."
fi

echo ""

# Cleanup
rm -f /tmp/wfconnect_fresh.sql
