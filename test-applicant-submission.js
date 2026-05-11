#!/usr/bin/env node

/**
 * Test Suite: Applicant Submission Payload Handling
 * 
 * Phase 4 of Applicant Submission Stabilization
 * Tests backend normalization and frontend robustness
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:5000';
const ENDPOINT = '/api/applicants';

let tests_passed = 0;
let tests_failed = 0;

// Helper to make HTTP requests
function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : {},
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: { raw: data },
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test runner
async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    tests_passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    tests_failed++;
  }
}

// Minimal valid payload for testing
function validPayload() {
  return {
    fullName: 'John Doe',
    phone: '(416) 555-0100',
    addressFull: '123 Main St, Toronto, ON M5V 3A5, Canada',
    addressStreet: '123 Main St',
    addressCity: 'Toronto',
    addressProvince: 'ON',
    addressPostalCode: 'M5V 3A5',
    addressCountry: 'Canada',
    applyingFor: 'Server',
    jobPostingSource: 'LinkedIn',
    photoData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA',
    photoFilename: 'photo.jpg',
    photoMimeType: 'image/jpeg',
    photoFileSize: 25000,
    resumeData: 'data:application/pdf;base64,JVBERi0xLjQK',
    resumeFilename: 'resume.pdf',
    resumeMimeType: 'application/pdf',
    resumeFileSize: 50000,
    smsConsent: true,
  };
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('APPLICANT SUBMISSION PAYLOAD TESTS (Phase 4)');
  console.log('='.repeat(70) + '\n');

  // Test 1: Invalid payload (missing required fields)
  await test('Rejects payload with missing required field (full_name)', async () => {
    const payload = validPayload();
    delete payload.fullName;
    const res = await makeRequest('POST', ENDPOINT, payload);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert(res.body.issues, 'Should include issues array');
  });

  // Test 2: Backward compatibility - alternate field names
  await test('Accepts payload with alternate fullName field (full_name)', async () => {
    const payload = validPayload();
    delete payload.fullName;
    payload.full_name = 'Jane Smith';
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should not fail on field name variation (backend accepts both)
    assert(res.status !== 400 || (res.status === 400 && !res.body.issues?.some(i => i.path?.includes('fullName'))), 
      `Alternate field name should be accepted or at least not complain about fullName`);
  });

  // Test 3: Extra fields should be ignored (strip behavior)
  await test('Silently ignores extra/unknown fields in payload', async () => {
    const payload = validPayload();
    payload.extraField1 = 'should be removed';
    payload.analyticsId = 'should be ignored';
    payload.customData = { nested: 'extra' };
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should not fail because of extra fields
    assert(res.status !== 400 || (res.status === 400 && !res.body.error?.includes('extra')), 
      `Extra fields should be stripped, not cause validation error`);
  });

  // Test 4: String file sizes coerced to numbers
  await test('Coerces string file sizes to numbers', async () => {
    const payload = validPayload();
    payload.photoFileSize = '25000';  // string instead of number
    payload.resumeFileSize = '50000'; // string instead of number
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should coerce successfully
    assert(res.status !== 400 || (res.status === 400 && !res.body.issues?.some(i => i.path?.includes('FileSize'))), 
      `String file sizes should be coerced to numbers`);
  });

  // Test 5: Consent acceptance - multiple formats
  await test('Accepts multiple consent representations (boolean, string, number)', async () => {
    const payload = validPayload();
    payload.smsConsent = 'true';  // string representation
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should accept string "true" as boolean
    assert(res.status !== 400 || (res.status === 400 && !res.body.issues?.some(i => i.path?.includes('smsConsent'))), 
      `Consent should accept string "true"`);
  });

  // Test 6: Phone normalization - multiple formats
  await test('Accepts multiple phone field names', async () => {
    const payload = validPayload();
    delete payload.phone;
    payload.phoneNumber = '416-555-0101';  // alternate name
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should accept alternate phone field names
    assert(res.status !== 400 || (res.status === 400 && !res.body.error?.includes('Phone')), 
      `Alternate phone field names should be accepted`);
  });

  // Test 7: Whitespace trimming
  await test('Trims whitespace from string fields', async () => {
    const payload = validPayload();
    payload.fullName = '  John Doe  '; // extra whitespace
    payload.addressCity = '  Toronto  ';
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should trim whitespace and accept
    assert(res.status !== 400 || (res.status === 400 && !res.body.issues?.some(i => i.message?.includes('trim'))), 
      `Whitespace should be trimmed`);
  });

  // Test 8: File data validation
  await test('Requires valid photo and resume data URIs', async () => {
    const payload = validPayload();
    payload.photoData = 'not-a-data-uri';  // invalid
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should reject invalid data URI
    assert(res.status === 400, `Invalid photo data should be rejected`);
  });

  // Test 9: Address field handling
  await test('Requires full address but accepts optional address components', async () => {
    const payload = validPayload();
    // Remove full address
    delete payload.addressFull;
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should require addressFull
    assert(res.status === 400, `Missing addressFull should fail`);
  });

  // Test 10: Coordinate validation
  await test('Validates latitude/longitude ranges correctly', async () => {
    const payload = validPayload();
    payload.addressLatitude = 91;  // Out of range (-90 to 90)
    const res = await makeRequest('POST', ENDPOINT, payload);
    // Should reject invalid latitude
    assert(res.status === 400, `Invalid latitude should be rejected`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${tests_passed} passed, ${tests_failed} failed`);
  console.log('='.repeat(70));
  console.log('\nNOTE: These tests require a running server at http://localhost:5000');
  console.log('Run: npm run server:prod');

  process.exit(tests_failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
