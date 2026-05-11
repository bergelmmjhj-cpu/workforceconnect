#!/usr/bin/env node

/**
 * Test Suite: Address Autocomplete Integration
 *
 * Verifies the isolated Google Places loader/component wiring for the public
 * apply form without requiring a browser test harness.
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('ADDRESS AUTOCOMPLETE INTEGRATION TEST SUITE');
console.log('='.repeat(70) + '\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: apply form injects frontend config and isolated scripts
test('HTML template contains isolated Google Places placeholders', () => {
  const html = fs.readFileSync(path.join(__dirname, 'server/templates/apply-form.html'), 'utf8');
  if (!html.includes('__GOOGLE_PLACES_FRONTEND_CONFIG__')) throw new Error('Frontend config placeholder missing');
  if (!html.includes('__GOOGLE_PLACES_LOADER_SCRIPT__')) throw new Error('Loader placeholder missing');
  if (!html.includes('__ADDRESS_AUTOCOMPLETE_SCRIPT__')) throw new Error('Component placeholder missing');
});

// Test 2: loader script includes required API bootstrapping and diagnostics
test('Google Places loader includes single-load bootstrapping and diagnostics', () => {
  const script = fs.readFileSync(path.join(__dirname, 'server/templates/scripts/google-places-loader.js'), 'utf8');
  if (!script.includes('libraries=places')) throw new Error('places library not requested');
  if (!script.includes('missing_api_key')) throw new Error('Missing API key diagnostic missing');
  if (!script.includes('google_script_failed_to_load')) throw new Error('Script load failure diagnostic missing');
  if (!script.includes('csp_blocked_script')) throw new Error('CSP diagnostic missing');
  if (!script.includes('referrer_or_domain_restriction_issue')) throw new Error('Referrer/domain diagnostic missing');
});

// Test 3: component script safely constructs google.maps.places.Autocomplete
test('AddressAutocomplete component guards Autocomplete construction and fallback states', () => {
  const script = fs.readFileSync(path.join(__dirname, 'server/templates/scripts/address-autocomplete.js'), 'utf8');
  if (!script.includes('createAddressAutocomplete')) throw new Error('Factory function missing');
  if (!script.includes('google.maps.places.Autocomplete')) throw new Error('Autocomplete constructor missing');
  if (!script.includes('places_library_missing')) throw new Error('Places library diagnostic missing');
  if (!script.includes('autocomplete_constructor_failed')) throw new Error('Constructor failure diagnostic missing');
  if (!script.includes('fallback_mode_triggered')) throw new Error('Fallback diagnostic missing');
});

// Test 4: server render path supports VITE_* and legacy env fallbacks
test('Server index resolves VITE_GOOGLE_MAPS_API_KEY with legacy fallbacks', () => {
  const ts = fs.readFileSync(path.join(__dirname, 'server/index.ts'), 'utf8');
  if (!ts.includes('VITE_GOOGLE_MAPS_API_KEY')) throw new Error('VITE env var support missing');
  if (!ts.includes('GOOGLE_MAPS_API_KEY')) throw new Error('GOOGLE_MAPS_API_KEY fallback missing');
  if (!ts.includes('GOOGLE_PLACES_API_KEY')) throw new Error('GOOGLE_PLACES_API_KEY fallback missing');
  if (!ts.includes('renderApplyFormTemplate')) throw new Error('apply form render helper missing');
});

// Test 5: apply form preserves existing payload fields
test('HTML template has all required address fields', () => {
  const html = fs.readFileSync(path.join(__dirname, 'server/templates/apply-form.html'), 'utf8');
  const fields = [
    'address_full', 'address_street', 'address_city', 'address_province',
    'address_postal_code', 'address_country', 'address_place_id',
    'address_street_number', 'address_street_name', 'address_place_types',
    'address_latitude', 'address_longitude'
  ];
  for (const field of fields) {
    const singleQuote = html.includes(`id='${field}'`);
    const doubleQuote = html.includes(`id="${field}"`);
    if (!singleQuote && !doubleQuote) throw new Error(`Missing field: ${field}`);
  }
});

// Test 6: apply form keeps submission contract and manual-entry flag
test('HTML template keeps the existing submit handler and payload contract', () => {
  const html = fs.readFileSync(path.join(__dirname, 'server/templates/apply-form.html'), 'utf8');
  if (!html.includes("'apply-form').addEventListener('submit'")) throw new Error('Submit handler not found');
  if (!html.includes('/api/applicants')) throw new Error('API endpoint not found');
  if (!html.includes('addressManualEntry')) throw new Error('Manual entry payload flag missing');
});

// Test 7: HTML template script stays structurally balanced
test('HTML template JavaScript has balanced braces', () => {
  const html = fs.readFileSync(path.join(__dirname, 'server/templates/apply-form.html'), 'utf8');
  const scriptMatch = html.match(/<script>[\s\S]*<\/script>/);
  if (!scriptMatch) throw new Error('Script tag not found');

  let braceCount = 0;
  for (const char of scriptMatch[0]) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
  }
  if (braceCount !== 0) throw new Error(`Unbalanced braces: ${braceCount}`);
});

console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('='.repeat(70) + '\n');

if (testsFailed > 0) {
  process.exit(1);
}

console.log('✅ ALL TESTS PASSED - Google Places loader/component wiring is verified\n');
process.exit(0);
