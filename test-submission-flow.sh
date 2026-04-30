#!/bin/bash
# Submission Flow Validation Script
# Tests the entire applicant submission pipeline

set -e

echo "================================"
echo "Application Submission Test Suite"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check Environment Variables
echo -e "${YELLOW}[TEST 1]${NC} Checking environment variables..."
if [ -z "$POSTGRES_URL" ] && [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}✗ FAILED${NC}: No database URL found"
  echo "  Set POSTGRES_URL or DATABASE_URL environment variable"
  exit 1
else
  echo -e "${GREEN}✓ PASSED${NC}: Database URL is set"
  if [ ! -z "$POSTGRES_URL" ]; then
    echo "  Using POSTGRES_URL: ${POSTGRES_URL:0:50}..."
  else
    echo "  Using DATABASE_URL: ${DATABASE_URL:0:50}..."
  fi
fi
echo ""

# Test 2: Check Server Can Start
echo -e "${YELLOW}[TEST 2]${NC} Checking if server can start..."
timeout 5 npm run server:dev > /tmp/server_test.log 2>&1 &
SERVER_PID=$!
sleep 2

if ps -p $SERVER_PID > /dev/null; then
  echo -e "${GREEN}✓ PASSED${NC}: Server started successfully"
  kill $SERVER_PID 2>/dev/null || true
else
  echo -e "${RED}✗ FAILED${NC}: Server failed to start"
  echo "  Error log:"
  cat /tmp/server_test.log | head -20
  exit 1
fi
echo ""

# Test 3: Check Node Modules
echo -e "${YELLOW}[TEST 3]${NC} Checking required dependencies..."
REQUIRED_PACKAGES=("express" "postgres" "drizzle-orm" "zod")
for pkg in "${REQUIRED_PACKAGES[@]}"; do
  if [ -d "node_modules/$pkg" ]; then
    echo -e "${GREEN}✓${NC} $pkg installed"
  else
    echo -e "${RED}✗${NC} $pkg missing - run: npm install"
    exit 1
  fi
done
echo ""

# Test 4: Check Database Schema
echo -e "${YELLOW}[TEST 4]${NC} Checking database schema..."
if psql "$POSTGRES_URL" -c "\dt applicants" > /dev/null 2>&1 || \
   psql "$DATABASE_URL" -c "\dt applicants" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASSED${NC}: 'applicants' table exists"
else
  echo -e "${RED}✗ FAILED${NC}: 'applicants' table not found"
  echo "  Run: npm run db:push"
  exit 1
fi
echo ""

# Test 5: Check Form Template
echo -e "${YELLOW}[TEST 5]${NC} Checking form template..."
if [ -f "server/templates/apply-form.html" ]; then
  if grep -q "api/applicants" server/templates/apply-form.html; then
    echo -e "${GREEN}✓ PASSED${NC}: Form template exists with correct endpoint"
  else
    echo -e "${RED}✗ FAILED${NC}: Form doesn't reference /api/applicants"
    exit 1
  fi
else
  echo -e "${RED}✗ FAILED${NC}: Form template not found"
  exit 1
fi
echo ""

# Test 6: Check for TypeScript Compilation
echo -e "${YELLOW}[TEST 6]${NC} Checking TypeScript compilation..."
if npm run check:types > /tmp/types_check.log 2>&1; then
  echo -e "${GREEN}✓ PASSED${NC}: TypeScript types are valid"
else
  echo -e "${RED}✗ FAILED${NC}: TypeScript compilation errors"
  cat /tmp/types_check.log | head -30
  exit 1
fi
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All Tests PASSED!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start the server: npm run server:dev"
echo "2. Test submission at: http://localhost:5000/apply-form"
echo "3. Monitor logs for: [APPLICANTS] ✅ or ❌"
echo "4. Check SUBMISSION_ISSUE_DEBUG.md for troubleshooting"
