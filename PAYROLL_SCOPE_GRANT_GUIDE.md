# Payroll API Key Scope Grant - Post-Deployment Guide

## Status: Route Fix Complete ✅

**Commit:** `4d0b10dc`
**Issue:** `/api/admin/applications/api-keys` route was being caught by the `/:id` parameterized route
**Solution:** Reordered routes so specific paths are matched before parameterized paths

## Route Order (Now Correct)
```
2098: GET /api/admin/applications           (list all applications)
2144: GET /api/admin/applications/api-keys  (key management) ← BEFORE :id
2346: GET /api/admin/applications/:id       (specific application)
```

## Post-Deployment Steps

### 1. Deploy Commit 4d0b10dc
After deploying the fix, **restart the server** to pick up the corrected route ordering.

### 2. Grant Payroll Key Scope

**Option A: Using Bash Script (Recommended)**
```bash
cd /workspaces/workforceconnect
API_BASE=https://guide.wfconnect.org \
ADMIN_USER=wfconnect \
ADMIN_PASS=@2255Dundaswest \
bash scripts/manage-api-keys.sh grant-payroll
```

**Option B: Using CURL Directly**

First, list keys to find the Payroll key ID:
```bash
curl -s -X GET \
  -u wfconnect:@2255Dundaswest \
  https://guide.wfconnect.org/api/admin/applications/api-keys | jq '.'
```

Then grant the scope (replace `KEY_ID` with actual ID):
```bash
curl -s -X PATCH \
  -u wfconnect:@2255Dundaswest \
  -H "Content-Type: application/json" \
  -d '{"scopes": ["applications:read"]}' \
  https://guide.wfconnect.org/api/admin/applications/api-keys/KEY_ID/scopes
```

**Option C: Using TypeScript Database Utility (If LOCAL)**
```bash
DATABASE_URL="your_connection_string" npx tsx scripts/grant-payroll-scope-now.ts
```

### 3. Verify the Scope Grant

**Check key scopes:**
```bash
curl -s -X GET \
  -u wfconnect:@2255Dundaswest \
  https://guide.wfconnect.org/api/admin/applications/api-keys | jq '.data[] | select(.name | contains("Payroll")) | .scopes'
```

Expected output:
```json
["applications:read"]
```

### 4. Test Bearer Auth with Payroll Key

**Get the plaintext key value from earlier creation:**
```bash
curl -s -X POST \
  -u wfconnect:@2255Dundaswest \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Bearer", "scopes": ["applications:read"]}' \
  https://guide.wfconnect.org/api/admin/applications/api-keys | jq '.plaintext'
```

**Test Bearer token authentication:**
```bash
curl -s -X GET \
  -H "Authorization: Bearer wfckey_xxxxxxxxxxxxxxxx" \
  https://guide.wfconnect.org/api/admin/applications | jq '.[] | {id, status, createdAt}' | head -20
```

Expected response: **200 OK** with list of worker applications

### 5. Verify Scope Enforcement

**Test WITHOUT applications:read scope (should get 403):**
```bash
# Create key without scope
curl -s -X POST \
  -u wfconnect:@2255Dundaswest \
  -H "Content-Type: application/json" \
  -d '{"name": "Test No Scope"}' \
  https://guide.wfconnect.org/api/admin/applications/api-keys

# Try to use it (replace with plaintext from response)
curl -s -X GET \
  -H "Authorization: Bearer wfckey_zzzzzzzzzzzzzz" \
  https://guide.wfconnect.org/api/admin/applications
```

Expected response: **403 Forbidden** with message about missing scope

## Troubleshooting

### "Application not found" error
- **Cause:** Server not restarted after deploying 4d0b10dc
- **Fix:** Restart the server

### "Invalid credentials" error  
- **Cause:** Wrong username/password for Basic Auth
- **Fix:** Use `wfconnect:@2255Dundaswest`

### "Key not found" on scope update
- **Cause:** Wrong key ID
- **Fix:** List keys first to get correct ID

### Bearer token returns 401
- **Cause:** Token is not valid or not properly signed
- **Fix:** Verify you're using the exact plaintext key from creation

### Bearer token returns 403 missing_scope
- **Cause:** Key doesn't have `applications:read` scope
- **Fix:** Run the grant-payroll script or manually patch the key

## Architecture Reference

The implementation uses a **tri-path authentication** system:

```
Request to GET /api/admin/applications
           ↓
    [Try Bearer Token]
        ↓        ↓
       Success  Fail
        ↓        ↓
      200    [Try Basic Auth]
              ↓        ↓
            Success   Fail
             ↓        ↓
            200    [Try Session Cookie]
                   ↓        ↓
                 Success   Fail
                  ↓        ↓
                 200      401
```

**Bearer tokens** support scope-based access control via the `scopes` field in the managed keys database.

## Key Files Modified in This Fix

- **server/routes.ts:** Routes reordered (commit 4d0b10dc)
- **scripts/manage-api-keys.sh:** Bash automation for scope grants
- **scripts/grant-payroll-scope-now.ts:** TypeScript database utility
- **API_KEY_SCOPE_IMPLEMENTATION.md:** Detailed technical documentation

## Commits in This Session

1. **fd530ff3** - Initial Bearer auth implementation
2. **140d910e** - Fix admin dashboard response format (array instead of {data, total})  
3. **b511158e** - Add key management scripts and documentation
4. **4d0b10dc** - Fix route ordering (api-keys before :id) ← **THIS FIXES THE ISSUE**

## Next Steps for Payroll Manager Integration

Once scope is granted:

1. **Update Payroll Server** to use Bearer auth:
   ```javascript
   const response = await fetch('https://guide.wfconnect.org/api/admin/applications', {
     headers: {
       'Authorization': `Bearer ${PAYROLL_API_KEY}`
     }
   });
   ```

2. **Configure in Environment:**
   ```
   PAYROLL_API_KEY=wfckey_xxxxxxxxxxxxx
   WORKFORCE_CONNECT_API=https://guide.wfconnect.org
   ```

3. **Test Sync:**
   - Payroll server should now get 200 responses
   - Can sync worker application data for payroll processing

---

**For questions or issues, refer to API_KEY_SCOPE_IMPLEMENTATION.md**
