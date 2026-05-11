# Applicant Submission Payload Documentation

## Current Schema Status

The `publicApplicantSubmissionSchema` in server/routes.ts supports:

### Name Fields (Flexible)
- fullName, full_name, firstName, first_name, lastName, last_name
- Resolution strategy: picks first present value

### Contact Fields (Flexible)
- phone, phoneNumber, phone_number, mobile, contactNumber
- All trimmed, canonicalized to E.164 format

### Address Fields (Complete)
- addressFull (required), addressStreet, addressCity, addressProvince, addressPostalCode, addressCountry
- addressPlaceId, addressStreetNumber, addressStreetName, addressPlaceTypes
- addressLatitude, addressLongitude (with -90/90 and -180/180 constraints)
- addressManualEntry (boolean flag)

### Position/Source (Required)
- applyingFor, jobPostingSource (required, trimmed)

### File Data (Required)
- photoData, photoFilename, photoMimeType, photoFileSize
- resumeData, resumeFilename, resumeMimeType, resumeFileSize
- File sizes coerced to non-negative integers

### Consent Fields (Flexible)
- smsConsent, marketingConsent, promotionalConsent
- Accept: boolean, "true"/"false" strings, 1/0

### Current Hardening Features
- `.strip()` - removes unknown keys (doesn't fail, just ignores)
- `optionalTrimmedStringSchema` - trims whitespace
- `requiredTrimmedStringSchema` - requires presence and trims
- `optionalNonNegativeIntSchema` - coerces file sizes to numbers
- `consentLikeSchema` - accepts multiple consent representations
- `coordinateSchema` - validates lat/long ranges

## PHASE 2: Backend Normalization (Already Implemented)

The `normalizePublicApplicantSubmissionPayload()` function already:
1. Handles extra fields gracefully via `.strip()`
2. Coerces file sizes to numbers
3. Trims strings
4. Normalizes consent values
5. Maps multiple field name variants to canonical names

## PHASE 3: Frontend Improvements Needed

Current form in server/templates/apply-form.html needs:
1. Better error message parsing for field-level issues
2. Pre-submit file validation before POST
3. Clearer retry logic (no retry on 4xx)

## PHASE 4: Tests Needed

Need to add tests for:
- Valid canonical payload → 200
- Extra keys payload → 200 (should be stripped)
- String file sizes → 200 (should be coerced)
- Missing required field → 400
- Invalid MIME type → 400
- Missing consent → 400

## Conclusion

The backend is already well-hardened with normalization and flexible schema. The remaining work is frontend improvements and test coverage.
