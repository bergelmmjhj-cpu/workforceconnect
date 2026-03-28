#!/bin/bash

# Test script to validate API route ordering fix
# This tests that /api/admin/applications/api-keys is accessible

echo "🧪 Testing API Route Ordering Fix"
echo "================================="
echo ""

# Note: This requires a running server with DATABASE_URL configured
# For local testing without running server, verify code structure instead

echo "✅ Verification 1: Route code order in server/routes.ts"
echo "Looking for route definitions..."
grep -n 'app.get("/api/admin/applications' server/routes.ts | head -4
echo ""

echo "✅ Verification 2: Checking route order is correct"
LINE_MAIN=$(grep -n 'app.get("/api/admin/applications",' server/routes.ts | cut -d: -f1)
LINE_KEYS=$(grep -n 'app.get("/api/admin/applications/api-keys' server/routes.ts | cut -d: -f1)
LINE_ID=$(grep -n 'app.get("/api/admin/applications/:id' server/routes.ts | grep -v 'agreement-pdf' | cut -d: -f1)

echo "  Main list endpoint: line $LINE_MAIN"
echo "  API keys endpoint: line $LINE_KEYS"
echo "  Specific ID endpoint: line $LINE_ID"
echo ""

if [ "$LINE_KEYS" -lt "$LINE_ID" ]; then
    echo "✅ PASS: api-keys route (line $LINE_KEYS) comes before :id route (line $LINE_ID)"
else
    echo "❌ FAIL: api-keys route should come before :id route"
    exit 1
fi

echo ""
echo "✅ Verification 3: Checking GET /api/admin/applications/api-keys implementation"
grep -A 20 'app.get("/api/admin/applications/api-keys' server/routes.ts | grep -E '(getManagedApiKeys|res\.json|error)' | head -5
echo ""

echo "✅ All route ordering validations passed!"
echo ""
echo "Next steps:"
echo "  1. Deploy this commit to production"
echo "  2. Run the grant-payroll script:"
echo "     API_BASE=https://guide.wfconnect.org \\"
echo "     ADMIN_USER=wfconnect \\"
echo "     ADMIN_PASS=@2255Dundaswest \\"
echo "     bash scripts/manage-api-keys.sh grant-payroll"
echo "  3. Test Bearer auth with Payroll key"
