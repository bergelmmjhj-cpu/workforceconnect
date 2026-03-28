# API Key Scope Management - Payroll Sync Implementation

## Overview

The Payroll sync needs to read applications using Bearer token auth on `GET /api/admin/applications`.
This guide provides the exact steps to grant the required `applications:read` scope to the Payroll API key.

## Quick Start

### Step 1: List Current API Keys

```bash
curl -X GET -u wfconnect:@2255Dundaswest \
  https://guide.wfconnect.org/api/admin/applications/api-keys
```

**Expected response:** JSON array showing all keys with IDs and current scopes
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Payroll Sync",
      "prefix": "wfc_...",
      "scopes": [],
      "createdAt": "2026-03-28T10:00:00Z",
      ...
    }
  ]
}
```

**Action:** Copy the `id` of the Payroll key.

### Step 2: Grant `applications:read` Scope

Replace `{KEY_ID}` with the ID from Step 1:

```bash
curl -X PATCH -u wfconnect:@2255Dundaswest \
  -H "Content-Type: application/json" \
  -d '{"scopes":["applications:read"]}' \
  https://guide.wfconnect.org/api/admin/applications/api-keys/{KEY_ID}/scopes
```

**Expected response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "scopes": ["applications:read"],
  "message": "Scopes updated successfully"
}
```

### Step 3: Verify Bearer Token Works

Test with the Payroll API key (get from admin UI or creation response):

```bash
curl -i -H "Authorization: Bearer wfc_xxxxx_yyyyy_zzzz" \
  https://guide.wfconnect.org/api/admin/applications
```

**Expected response (200):**
```text
HTTP/2 200
Content-Type: application/json

[
  {
    "id": "app-1",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "approved",
    ...
  },
  ...
]
```

---

## Complete Endpoint Specifications

### GET /api/admin/applications
Retrieve all worker applications (list view)

**Auth paths supported:**
1. **Bearer token** (new) - requires `applications:read` scope
   ```
   Authorization: Bearer <payroll_api_key>
   ```

2. **Basic Auth** - existing admin credentials
   ```
   Authorization: Basic <base64(username:password)>
   ```

3. **Session cookie** - browser login
   ```
   Cookie: wfc_session=<session_token>
   ```

**Response:**
- `200` on success: JSON array of applications
- `401` if auth invalid or missing
- `403` if Bearer key valid but missing `applications:read` scope

**Error response (403 - missing scope):**
```json
{
  "error": "API key missing required scope: applications:read",
  "required_scope": "applications:read",
  "your_scopes": []
}
```

---

### Endpoint Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/applications` | List applications (any valid auth) |
| GET | `/api/admin/applications/api-keys` | List API keys with scopes |
| POST | `/api/admin/applications/api-keys` | Create new API key with scopes |
| PATCH | `/api/admin/applications/api-keys/:id/scopes` | Update scopes on existing key |
| DELETE | `/api/admin/applications/api-keys/:id` | Revoke API key |

---

## Management Scripts

### Using the bash script (requires curl + jq)

```bash
# List all keys
bash scripts/manage-api-keys.sh list

# Grant scope to specific key
bash scripts/manage-api-keys.sh grant "Payroll Sync" "applications:read"

# Auto-detect and grant to Payroll key
API_BASE=https://guide.wfconnect.org \
ADMIN_USER=wfconnect \
ADMIN_PASS=@2255Dundaswest \
bash scripts/manage-api-keys.sh grant-payroll

# Test Bearer token auth
bash scripts/manage-api-keys.sh test-bearer wfc_xxxxx_yyyyy_zzzz
```

---

## Troubleshooting

### 403 missing_scope
**Problem:** Bearer key returns 403 with "missing required scope: applications:read"
**Solution:** Run Step 2 above to grant the scope

### 401 Invalid credentials
**Problem:** cURL returns 401
**Solution:** Verify admin credentials are correct:
- Username: `wfconnect`
- Password: `@2255Dundaswest`

### 404 Key not found
**Problem:** PATCH endpoint returns "Key not found"
**Solution:** Use correct key ID from Step 1 list output

### jq not installed
**Problem:** Scripts fail on Ubuntu/Linux
**Solution:** `sudo apt-get install jq`

---

## Implementation Checklist

- [ ] List all API keys (Step 1)
- [ ] Identify Payroll key ID
- [ ] Get the plaintext Payroll API key (from creation response or admin)
- [ ] Grant `applications:read` scope (Step 2)
- [ ] Test Bearer auth with Payroll key (Step 3)
- [ ] Verify 200 response with applications list
- [ ] Configure Payroll sync to use Bearer token
- [ ] Test Payroll sync reads applications successfully

---

## Code Locations

**Authentication & Authorization:**
- [server/routes.ts](../server/routes.ts#L446) - `tryBearerApiKey` middleware
- [server/routes.ts](../server/routes.ts#L2098) - GET /api/admin/applications with tri-path auth
- [server/routes.ts](../server/routes.ts#L2104) - Scope enforcement

**Key Management:**
- [server/routes.ts](../server/routes.ts#L2323) - GET /api/admin/applications/api-keys
- [server/routes.ts](../server/routes.ts#L2348) - POST /api/admin/applications/api-keys (create)
- [server/routes.ts](../server/routes.ts#L2459) - PATCH /api/admin/applications/api-keys/:id/scopes (update)

---

## Deployment Status

✅ Code deployed to main branch (commit fd530ff3 and 140d910e)
✅ Bearer auth with scope support fully functional
✅ API endpoints ready for use
⏳ Payroll key awaiting scope grant (manual step via curl commands above)
