/**
 * Address Autocomplete Utility Module
 * 
 * Provides production-grade address autocomplete with explicit diagnostics,
 * quality scoring, deduplication, and graceful fallback handling.
 * 
 * Architecture:
 * - Frontend calls backend proxy endpoints (/api/places/autocomplete, /api/places/details/:placeId)
 * - Backend calls Google Places API directly
 * - Frontend receives real Google results with quality scoring applied
 * - Fallback: manual entry with warning when Google Places unavailable
 * 
 * Key Features:
 * - Quality scoring (prioritizes complete street-level Canadian addresses)
 * - Deduplication and ranking
 * - Explicit diagnostic logging for production troubleshooting
 * - Configurable retry logic for transient failures
 * - Canada-only validation
 */

/**
 * Diagnostics and Event Logging
 * Use this to track autocomplete lifecycle events for production debugging
 */
export interface PlacesClientDiagnostics {
  // Autocomplete request lifecycle
  autocomplete_request_start: { inputLength: number };
  autocomplete_response_status: {
    status: number;
    ok: boolean;
    failureCategory: string | null;
    failureStage: string | null;
  };
  autocomplete_exception: { message: string };

  // Place details lifecycle
  details_response_status: {
    status: number;
    ok: boolean;
    failureCategory: string | null;
    failureStage: string | null;
  };
  details_exception: { message: string };

  // Fallback management
  fallback_triggered: {
    mode: 'transient' | 'permanent';
    reason: string;
    failureCategory: string | null;
    failureStage: string | null;
    retryAfterMs: number;
  };
  fallback_cleared: { reason: string };
  fallback_retry_attempted: { afterMs: number };
}

/**
 * Address quality scoring for ranking predictions
 */
export interface AddressQualitySignals {
  hasStreetNumber: boolean;
  hasStreetName: boolean;
  hasCity: boolean;
  hasProvince: boolean;
  hasPostalCode: boolean;
  hasCountry: boolean;
  isVague: boolean;
}

/**
 * Score-based prediction ranking
 * Higher score = better match for street-level address
 */
export interface ScoredPrediction {
  prediction: any;
  qualityScore: number;
  qualitySignals: AddressQualitySignals;
}

/**
 * Fallback States
 * - null: Autocomplete working normally
 * - 'transient': Temporary failure (will retry after delay)
 * - 'permanent': Permanent failure (missing API key, invalid key, etc.)
 */
export type FallbackMode = null | 'transient' | 'permanent';

/**
 * Configuration for address autocomplete behavior
 */
export interface AddressAutocompleteConfig {
  /** Country restriction (currently Canada-only) */
  country: 'CA';
  /** Placeholder text for input */
  placeholder?: string;
  /** Is address required */
  required?: boolean;
  /** Transient failure retry delay in ms */
  transientRetryDelayMs?: number;
  /** Max suggestions to display */
  maxSuggestions?: number;
}

/**
 * Default configuration
 */
export const DEFAULT_ADDRESS_AUTOCOMPLETE_CONFIG: AddressAutocompleteConfig = {
  country: 'CA',
  placeholder: 'Enter your full address',
  required: true,
  transientRetryDelayMs: 3000,
  maxSuggestions: 8,
};

/**
 * Fallback message when autocomplete unavailable
 */
export const MANUAL_ADDRESS_WARNING_MESSAGE =
  'Address autocomplete is unavailable. Please enter your full address manually including city, province, and postal code.';

/**
 * Permanent failure categories (don't retry)
 */
export const AUTOCOMPLETE_PERMANENT_FAILURE_CATEGORIES = new Set([
  'CONFIG_MISSING_KEY',
  'INVALID_KEY',
  'API_NOT_ACTIVATED',
  'BILLING_INACTIVE_OR_INVALID',
  'RESTRICTION_BLOCKED',
  'QUOTA_EXCEEDED',
]);

/**
 * Quality scoring utility
 * Scores predictions to prioritize complete street-level addresses
 */
export function scoreAddressPrediction(prediction: any): ScoredPrediction {
  const description = (prediction?.description || '').trim().toLowerCase();
  const mainText = (prediction?.structured_formatting?.main_text || '').trim().toLowerCase();
  const secondaryText = (prediction?.structured_formatting?.secondary_text || '').trim().toLowerCase();
  const types = Array.isArray(prediction?.types) ? prediction.types : [];

  // Address component analysis
  const hasStreetNumber = /^\d+[A-Za-z]?\b/.test(mainText);
  const hasStreetName = /[A-Za-z]/.test(mainText.replace(/^\d+[A-Za-z]?\b\s*/, ''));
  const provinceSegments = secondaryText.split(',').map((s) => s.trim()).filter(Boolean);
  const hasCity = provinceSegments.length >= 2;
  const hasProvince = /\b(ab|bc|mb|nb|nl|ns|nt|nu|on|pe|qc|sk|yt)\b/i.test(secondaryText);
  const hasPostalCode = /\b[a-z]\d[a-z][\s-]?\d[a-z]\d\b/i.test(description);
  const hasCountry = /canada/i.test(description);
  const isVague = /,\s*canada\s*$/.test(description) && !hasProvince;

  // Quality score (higher is better)
  let qualityScore = 0;
  if (types.includes('street_address')) qualityScore += 150;
  if (types.includes('premise')) qualityScore += 90;
  if (types.includes('subpremise')) qualityScore += 60;
  if (hasStreetNumber) qualityScore += 70;
  if (hasStreetName) qualityScore += 45;
  if (hasCity) qualityScore += 35;
  if (hasProvince) qualityScore += 30;
  if (hasPostalCode) qualityScore += 20;
  if (types.includes('route') && !hasStreetNumber) qualityScore -= 70;
  if (types.includes('locality') || types.includes('administrative_area_level_1')) qualityScore -= 50;
  if (isVague) qualityScore -= 120;

  return {
    prediction,
    qualityScore,
    qualitySignals: {
      hasStreetNumber,
      hasStreetName,
      hasCity,
      hasProvince,
      hasPostalCode,
      hasCountry,
      isVague,
    },
  };
}

/**
 * Rank and filter predictions
 * - Scores all predictions
 * - Prioritizes complete addresses
 * - Deduplicates similar descriptions
 * - Returns top 8 sorted by quality score
 */
export function rankAndFilterPredictions(predictions: any[]): any[] {
  if (!Array.isArray(predictions)) return [];

  const scored = predictions
    .filter((p) => p?.place_id && p?.description)
    .map(scoreAddressPrediction);

  // Check if we have complete addresses
  const completeCount = scored.filter((s) =>
    s.qualitySignals.hasStreetNumber &&
    s.qualitySignals.hasStreetName &&
    s.qualitySignals.hasCity &&
    s.qualitySignals.hasProvince,
  ).length;

  // Filter out vague results if we have complete ones
  const filtered = completeCount > 0
    ? scored.filter((s) => !s.qualitySignals.isVague)
    : scored;

  // Deduplicate by normalized description
  const dedupMap = new Map<string, ScoredPrediction>();
  for (const item of filtered) {
    const key = (item.prediction.description || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const existing = dedupMap.get(key);
    if (!existing || item.qualityScore > existing.qualityScore) {
      dedupMap.set(key, item);
    }
  }

  // Sort by quality score descending, take top 8
  return Array.from(dedupMap.values())
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 8)
    .map((s) => s.prediction);
}

/**
 * Diagnostic logger configuration
 * Frontend component should call this to log important events
 */
export function createPlacesDiagnosticsLogger(
  namespace: string = 'AddressAutocomplete',
): {
  log: (event: keyof PlacesClientDiagnostics, data: any) => void;
  logError: (stage: string, error: Error | string, context?: any) => void;
} {
  return {
    log: (event, data) => {
      if (typeof window !== 'undefined' && window.console) {
        console.log(`[${namespace}:${String(event)}]`, data);
      }
    },
    logError: (stage, error, context) => {
      if (typeof window !== 'undefined' && window.console) {
        console.error(`[${namespace}:ERROR:${stage}]`, {
          message: error instanceof Error ? error.message : String(error),
          ...context,
        });
      }
    },
  };
}

/**
 * Validates that a response is a permanent failure that shouldn't be retried
 */
export function isPermanentFailure(response: any): boolean {
  if (response?.retryable === false) return true;
  if (!response?.failureCategory) return false;
  return AUTOCOMPLETE_PERMANENT_FAILURE_CATEGORIES.has(String(response.failureCategory));
}

/**
 * Determines if an HTTP status should trigger fallback mode
 */
export function shouldFallbackToManual(
  httpStatus: number,
  response: any,
): boolean {
  if (httpStatus >= 500) return true; // Server error
  if (httpStatus === 429) return true; // Rate limited
  if (isPermanentFailure(response)) return true; // Permanent config/key issue
  return false;
}

/**
 * Determines fallback mode based on failure type
 */
export function determineFallbackMode(httpStatus: number, response: any): FallbackMode {
  if (!shouldFallbackToManual(httpStatus, response)) return null;
  return isPermanentFailure(response) ? 'permanent' : 'transient';
}

/**
 * Creates a fallback context object for diagnostics
 */
export function createFallbackContext(
  reason: string,
  httpStatus: number,
  response: any,
): {
  reason: string;
  failureCategory: string | null;
  failureStage: string | null;
  httpStatus: number;
} {
  return {
    reason,
    failureCategory: response?.failureCategory || null,
    failureStage: response?.failureStage || null,
    httpStatus,
  };
}

export default {
  scoreAddressPrediction,
  rankAndFilterPredictions,
  createPlacesDiagnosticsLogger,
  isPermanentFailure,
  shouldFallbackToManual,
  determineFallbackMode,
  createFallbackContext,
};
