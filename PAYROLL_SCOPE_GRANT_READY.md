# 🎯 Payroll API Key Scope Grant - Ready to Execute

## Current Status
✅ **Route ordering fix deployed** (Commit 4d0b10dc)
✅ **Documentation complete**
📋 **Ready for scope grant execution**

## The Problem We Fixed
The `/api/admin/applications/api-keys` endpoint was returning "Application not found" because Express was matching the `/:id` route before the `/api-keys` path.

**Route matching order (was wrong):**
```
GET /api/admin/applications/api-keys
↓ [Express tries routes in order]
❌ Matches GET /api/admin/applications/:id (treats "api-keys" as ID)
→ Looks for application with id="api-keys"
→ Returns 404 "Application not found"
✓ Never reaches GET /api/admin/applications/api-keys
```

**Route matching order (now correct):**
```
GET /api/admin/applications/api-keys
↓ [Express tries routes in order]  
✅ MATCHES GET /api/admin/applications/api-keys (specific path first!)
→ Executes key management endpoint
→ Returns 200 with list of keys
```

## Execute the Scope Grant NOW

### Option 1: Automated Bash Script ⭐ RECOMMENDED
```bash
cd /workspaces/workforceconnect

# Set environment and run
API_BASE=https://guide.wfconnect.org \
ADMIN_USER=wfconnect \
ADMIN_PASS=@2255Dundaswest \
bash scripts/manage-api-keys.sh grant-payroll
```

**Expected output:**
```
📋 Listing API keys...
✅ Found 1 key(s)

1. Payroll Sync Manager [✅ ACTIVE]
   ID: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
   Current scopes: (none)

🎯 Found target key: Payroll Sync Manager
💾 Granting scope: applications:read
✅ Scope granted successfully!

   Key: Payroll Sync Manager
   ID: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
   Updated scopes: applications:read
```

### Option 2: Manual CURL Commands
```bash
# Step 1: List keys to verify which one is Payroll
curl -s -X GET -u wfconnect:@2255Dundaswest \
  https://guide.wfconnect.org/api/admin/applications/api-keys | jq '.data'

# Step 2: Identify the Payroll key ID from output (look for name containing "Payroll")

# Step 3: Grant scope (replace YOUR_KEY_ID)
curl -s -X PATCH -u wfconnect:@2255Dundaswest \
  -H "Content-Type: application/json" \
  -d '{"scopes": ["applications:read"]}' \
  https://guide.wfconnect.org/api/admin/applications/api-keys/YOUR_KEY_ID/scopes | jq '.'

# Step 4: Verify scope was granted
curl -s -X GET -u wfconnect:@2255Dundaswest \
  https://guide.wfconnect.org/api/admin/applications/api-keys | jq '.data[] | select(.name | contains("Payroll"))'
```

### Option 3: TypeScript Database Utility (LOCAL ONLY)
```bash
# Only works if DATABASE_URL is set in environment
DATABASE_URL="postgresql://..." npx tsx scripts/grant-payroll-scope-now.ts
```

## Verify the Grant Worked ✅

After running the script, verify with:

```bash
# Check Payroll key now has applications:read scope
curl -s -X GET -u wfconnect:@2255Dundaswest \
  https://guide.wfconnect.org/api/admin/applications/api-keys | jq '.data[] | select(.name | contains("Payroll")) | {name, scopes}'
```

**Expected output:**
```json
{
  "name": "Payroll Sync Manager",
  "scopes": ["applications:read"]
}
```

## Test Bearer Auth with Payroll Key 🔒

```bash
# 1. Get the plaintext key value (check from creation or contact admin)
PAYROLL_KEY="wfc_your_actual_key_here"

# 2. Test Bearer auth - should get 200 with applications list
curl -s -X GET \
  -H "Authorization: Bearer $PAYROLL_KEY" \
  https://guide.wfconnect.org/api/admin/applications | jq '.[0:2]'
```

**Expected response: 200 OK**
```json
[
  {
    "id": "app-uuid-1",
    "workerId": "worker-id-1",
    "status": "submitted",
    "createdAt": "2024-12-14T09:15:00Z",
    ...
  },
  {
    "id": "app-uuid-2",
    "workerId": "worker-id-2", 
    "status": "approved",
    "createdAt": "2024-12-14T10:30:00Z",
    ...
  }
]
```

## Next Steps for Payroll Integration

1. **Update Payroll Manager** to use the Bearer token:
   ```javascript
   const payrollApiKey = 'wfc_xxxxxxxxxxxxx';
   
   async function syncApplications() {
     const response = await fetch('https://guide.wfconnect.org/api/admin/applications', {
       headers: {
         'Authorization': `Bearer ${payrollApiKey}`
       }
     });
     
     if (!response.ok) {
       console.error(`Sync failed: ${response.status} ${response.statusText}`);
       return;
     }
     
     const applications = await response.json();
     // Process for payroll...
   }
   ```

2. **Store key securely** in Payroll Manager environment:
   ```env
   WORKFORCE_CONNECT_API=https://guide.wfconnect.org
   PAYROLL_API_KEY=wfc_xxxxxxxxxxxxx
   ```

3. **Test integrated sync** process

## Structure of Deployed Code

```
Commits in main branch:
─ fd530ff3: Bearer token middleware + scope checking
─ 140d910e: Admin dashboard response fix  
─ b511158e: Management scripts + documentation
─ 4d0b10dc: ⭐ CRITICAL: Route ordering fix
─ aec2a8e3: Post-deployment guide
─ c0bb7c5f: Comprehensive documentation
```

## What Gets Stored in Database

The Payroll API key is stored as a JSON object in the `app_config` table:

```json
{
  "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "name": "Payroll Sync Manager",
  "prefix": "wfc_12345678",
  "hash": "sha256(plaintext_key_here)",
  "scopes": ["applications:read"],
  "createdAt": "2024-12-14T08:00:00Z",
  "createdBy": "admin",
  "lastUsedAt": "2024-12-14T14:45:32Z",
  "revokedAt": null,
  "revokedBy": null
}
```

**Key points:**
- ✅ Plaintext key is **NEVER stored** - only hash
- ✅ Plaintext shown only at creation time
- ✅ `lastUsedAt` updated on each API call
- ✅ Can be revoked by setting `revokedAt`

## Troubleshooting

### Error: "Application not found"
- **Cause:** Server not restarted after deploying 4d0b10dc
- **Fix:** Check Render deployment status, wait for restart, or manually restart

### Error: "Invalid credentials"  
- **Cause:** Wrong password
- **Fix:** Use exactly `wfconnect:@2255Dundaswest`

### Error: "Key not found" on PATCH
- **Cause:** Wrong key ID
- **Fix:** Run list command first to confirm ID

### Bearer token returns 403 missing_scope
- **Cause:** Scope not granted yet
- **Fix:** Run grant-payroll script

### Bearer token returns 401
- **Cause:** Invalid token format
- **Fix:** Verify plaintext key starts with `wfc_`

## Reference Documentation

For more details, see:
- **BEARER_AUTH_IMPLEMENTATION_SUMMARY.md** - Complete technical docs
- **PAYROLL_SCOPE_GRANT_GUIDE.md** - Detailed post-deployment guide  
- **API_KEY_SCOPE_IMPLEMENTATION.md** - Implementation specifics
- **server/routes.ts** - Source code (lines 361-510 for auth helpers, 2098-2500 for endpoints)

---

## ✅ Ready to Execute!

The codebase is fully prepared. All you need to do is run ONE command:

```bash
API_BASE=https://guide.wfconnect.org \
ADMIN_USER=wfconnect \
ADMIN_PASS=@2255Dundaswest \
bash scripts/manage-api-keys.sh grant-payroll
```

This will automatically:
1. ✅ List all API keys
2. ✅ Find the Payroll key
3. ✅ Grant `applications:read` scope
4. ✅ Verify the grant succeeded

**Deployment Status: READY** 🚀
**Scope Grant Status: READY TO EXECUTE** 🎯
