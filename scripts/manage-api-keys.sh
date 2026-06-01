#!/bin/bash

# API Key Management Script using HTTP endpoints
# Usage: bash scripts/manage-api-keys.sh <command> [args]

set -e

API_BASE="${API_BASE:-https://guide.wfconnect.org}"
ADMIN_USER="${ADMIN_USER:-${ADMIN_USERNAME:-WFC}}"
ADMIN_PASS="${ADMIN_PASS:-${ADMIN_PASSWORD:-!WFC!}}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_usage() {
  cat << EOF
Usage: bash scripts/manage-api-keys.sh <command> [args]

Commands:
  list                              List all API keys and their scopes
  grant <key-name> <scope>          Grant a scope to an existing key
  grant-payroll                     Auto-detect and grant applications:read to Payroll key
  test-bearer <key>                 Test Bearer token auth against GET /api/admin/applications

Environment Variables:
  API_BASE                          Base URL (default: https://guide.wfconnect.org)
  ADMIN_USER                        Admin username (default: WFC; overrides ADMIN_USERNAME env)
  ADMIN_PASS                        Admin password (default: uses ADMIN_PASSWORD env)

Examples:
  bash scripts/manage-api-keys.sh list
  bash scripts/manage-api-keys.sh grant "Payroll Sync" "applications:read"
  bash scripts/manage-api-keys.sh grant-payroll
  bash scripts/manage-api-keys.sh test-bearer wfc_xxxxx_yyyyy_zzzz

EOF
}

function list_keys() {
  echo -e "${BLUE}📋 Fetching API keys...${NC}\n"
  
  response=$(curl -s -X GET \
    -u "$ADMIN_USER:$ADMIN_PASS" \
    "$API_BASE/api/admin/applications/api-keys")
  
  # Check if response has data
  if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
    count=$(echo "$response" | jq '.data | length')
    if [ "$count" -eq 0 ]; then
      echo -e "${RED}❌ No API keys found${NC}\n"
      return 1
    fi
    
    echo -e "${GREEN}✅ Found $count API key(s)${NC}\n"
    
    echo "$response" | jq -r '.data[] |
      "  Name: \(.name)",
      "  ID: \(.id)",
      "  Status: \((if .revokedAt then "REVOKED" else "ACTIVE" end))",
      "  Prefix: \(.prefix)",
      "  Scopes: \((if (.scopes | length) > 0 then (.scopes | join(", ")) else "(none)" end))",
      "  Created: \(.createdAt)",
      (if .lastUsedAt then "  Last used: \(.lastUsedAt)" else empty end),
      (if .revokedAt then "  Revoked: \(.revokedAt)" else empty end),
      "---"'
  else
    echo -e "${RED}❌ Error fetching keys:${NC}"
    echo "$response" | jq '.'
    return 1
  fi
}

function grant_scope() {
  local key_name="$1"
  local scope="$2"
  
  if [ -z "$key_name" ] || [ -z "$scope" ]; then
    echo -e "${RED}❌ Error: Missing key-name or scope${NC}"
    echo "Usage: bash scripts/manage-api-keys.sh grant \"<key-name>\" \"<scope>\""
    return 1
  fi
  
  echo -e "${BLUE}🔍 Finding key \"$key_name\"...${NC}"
  
  response=$(curl -s -X GET \
    -u "$ADMIN_USER:$ADMIN_PASS" \
    "$API_BASE/api/admin/applications/api-keys")
  
  local matches
  matches=$(echo "$response" | jq -c --arg key_name "$key_name" '[.data[] | select(.name == $key_name and (.revokedAt | not))]')
  local match_count
  match_count=$(echo "$matches" | jq 'length')

  if [ "$match_count" -eq 0 ]; then
    echo -e "${RED}❌ Key \"$key_name\" not found${NC}\n"
    echo "Available keys:"
    echo "$response" | jq -r '.data[] | "  - \(.name)"'
    echo
    return 1
  fi

  if [ "$match_count" -gt 1 ]; then
    echo -e "${RED}❌ Multiple active keys found with name \"$key_name\"${NC}"
    echo "Use a unique key name before granting scope."
    echo "$matches" | jq -r '.[] | "  - ID: \(.id) | Created: \(.createdAt)"'
    echo
    return 1
  fi

  key_id=$(echo "$matches" | jq -r '.[0].id')
  
  echo -e "${BLUE}💾 Granting scope \"$scope\" to key (ID: $key_id)...${NC}"
  
  update_response=$(curl -s -X PATCH \
    -u "$ADMIN_USER:$ADMIN_PASS" \
    -H "Content-Type: application/json" \
    -d "{\"scopes\":[\"$scope\"]}" \
    "$API_BASE/api/admin/applications/api-keys/$key_id/scopes")
  
  if echo "$update_response" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully granted scope!${NC}"
    echo "$update_response" | jq '{id, scopes, message}'
  else
    echo -e "${RED}❌ Error granting scope:${NC}"
    echo "$update_response" | jq '.'
    return 1
  fi
}

function grant_payroll() {
  echo -e "${BLUE}🔍 Auto-detecting Payroll key...${NC}"
  
  response=$(curl -s -X GET \
    -u "$ADMIN_USER:$ADMIN_PASS" \
    "$API_BASE/api/admin/applications/api-keys")
  
  # Find latest active Payroll key (case-insensitive, not revoked)
  key=$(echo "$response" | jq -c '[.data[] | select(
    (.revokedAt | not) and
    (.name | ascii_downcase | (contains("payroll") or contains("sync")))
  )] | sort_by(.createdAt) | last')

  if [ -z "$key" ] || [ "$key" = "null" ]; then
    echo -e "${RED}❌ Could not find active Payroll key${NC}\n"
    echo "Available active keys:"
    echo "$response" | jq -r '.data[] | select(.revokedAt | not) | "  - \(.name)"'
    echo
    return 1
  fi
  
  key_name=$(echo "$key" | jq -r '.name')
  key_id=$(echo "$key" | jq -r '.id')
  current_scopes=$(echo "$key" | jq -r '.scopes')
  
  echo -e "Found: ${YELLOW}$key_name${NC} (ID: $key_id)"
  echo -e "Current scopes: $current_scopes\n"
  
  # Check if already has scope
  if echo "$current_scopes" | grep -q "applications:read"; then
    echo -e "${YELLOW}ℹ️  Key already has 'applications:read' scope${NC}\n"
    return 0
  fi
  
  echo -e "${BLUE}💾 Granting 'applications:read' scope...${NC}"
  
  update_response=$(curl -s -X PATCH \
    -u "$ADMIN_USER:$ADMIN_PASS" \
    -H "Content-Type: application/json" \
    -d '{"scopes":["applications:read"]}' \
    "$API_BASE/api/admin/applications/api-keys/$key_id/scopes")
  
  if echo "$update_response" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Success!${NC}"
    echo "$update_response" | jq '{id, scopes, message}'
    echo
  else
    echo -e "${RED}❌ Error granting scope:${NC}"
    echo "$update_response" | jq '.'
    return 1
  fi
}

function test_bearer() {
  local key="$1"
  
  if [ -z "$key" ]; then
    echo -e "${RED}❌ Error: Missing API key${NC}"
    echo "Usage: bash scripts/manage-api-keys.sh test-bearer <key>"
    return 1
  fi
  
  echo -e "${BLUE}🧪 Testing Bearer token auth...${NC}"
  echo "Key: $key"
  echo "Endpoint: GET $API_BASE/api/admin/applications\n"
  
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
    -H "Authorization: Bearer $key" \
    "$API_BASE/api/admin/applications")
  
  status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status" = "200" ]; then
    count=$(echo "$body" | jq '. | length' 2>/dev/null || echo "?")
    echo -e "${GREEN}✅ Success (200)${NC}"
    echo "Applications returned: $count"
  elif [ "$status" = "403" ]; then
    echo -e "${YELLOW}⚠️  Forbidden (403)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  elif [ "$status" = "401" ]; then
    echo -e "${RED}❌ Unauthorized (401)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Error ($status)${NC}"
    echo "$body"
  fi
}

# Main script logic
if [ $# -eq 0 ]; then
  print_usage
  exit 0
fi

command="$1"
shift

case "$command" in
  list)
    list_keys
    ;;
  grant)
    grant_scope "$@"
    ;;
  grant-payroll)
    grant_payroll
    ;;
  test-bearer)
    test_bearer "$@"
    ;;
  help|--help|-h)
    print_usage
    ;;
  *)
    echo -e "${RED}❌ Unknown command: $command${NC}\n"
    print_usage
    exit 1
    ;;
esac

exit $?
