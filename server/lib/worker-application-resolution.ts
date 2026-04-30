type GenericRecord = Record<string, unknown>;

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on" || normalized === "accepted";
  }
  return false;
}

function asObject(value: unknown): GenericRecord | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as GenericRecord;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as GenericRecord;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getFirstNonEmpty(source: GenericRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeText(source[key]);
    if (value) return value;
  }
  return undefined;
}

function getNestedPaymentObjects(source: GenericRecord): GenericRecord[] {
  const containers = [
    "paymentInfo",
    "payment_info",
    "paymentDetails",
    "payment_details",
    "bankingInfo",
    "banking_info",
    "bankInfo",
    "bank_info",
  ];

  return containers
    .map((key) => asObject(source[key]))
    .filter((value): value is GenericRecord => Boolean(value));
}

export type ResolvedPaymentFields = {
  paymentMethod?: string;
  bankName?: string;
  bankInstitution?: string;
  bankTransit?: string;
  bankAccount?: string;
  etransferEmail?: string;
};

export type ResolvedAcknowledgmentFields = {
  backgroundCheckConsent: boolean;
  titoAcknowledgment: boolean;
  siteRulesAcknowledgment: boolean;
  workerAgreementConsent: boolean;
  privacyConsent: boolean;
  consentToContact: boolean;
  nonSolicitationAcknowledged: boolean;
  marketingConsent: boolean;
  independentContractorStatusAcknowledged: boolean;
};

export function resolvePaymentFields(sourceInput: GenericRecord): ResolvedPaymentFields {
  const nested = getNestedPaymentObjects(sourceInput);
  const source: GenericRecord = { ...sourceInput };

  for (const item of nested) {
    for (const [key, value] of Object.entries(item)) {
      if (source[key] === undefined || source[key] === null || source[key] === "") {
        source[key] = value;
      }
    }
  }

  const paymentMethod = getFirstNonEmpty(source, [
    "paymentMethod",
    "payment_method",
    "payment",
    "method",
  ]);

  const bankName = getFirstNonEmpty(source, [
    "bankName",
    "bank_name",
    "bank",
    "name",
  ]);

  const bankInstitution = getFirstNonEmpty(source, [
    "bankInstitution",
    "bank_institution",
    "institutionNumber",
    "institution_number",
    "institution",
  ]);

  const bankTransit = getFirstNonEmpty(source, [
    "bankTransit",
    "bank_transit",
    "transitNumber",
    "transit_number",
    "transit",
  ]);

  const bankAccount = getFirstNonEmpty(source, [
    "bankAccount",
    "bank_account",
    "accountNumber",
    "account_number",
    "account",
  ]);

  const etransferEmail = getFirstNonEmpty(source, [
    "etransferEmail",
    "etransfer_email",
    "eTransferEmail",
    "e_transfer_email",
    "directDepositEmail",
    "direct_deposit_email",
  ]);

  return {
    paymentMethod,
    bankName,
    bankInstitution,
    bankTransit,
    bankAccount,
    etransferEmail,
  };
}

export function arePaymentFieldsMissing(source: GenericRecord): boolean {
  const resolved = resolvePaymentFields(source);
  return !resolved.paymentMethod &&
    !resolved.bankName &&
    !resolved.bankInstitution &&
    !resolved.bankTransit &&
    !resolved.bankAccount &&
    !resolved.etransferEmail;
}

export function resolveAcknowledgmentFields(sourceInput: GenericRecord): ResolvedAcknowledgmentFields {
  const source: GenericRecord = { ...sourceInput };

  return {
    backgroundCheckConsent: toBoolean(source.backgroundCheckConsent ?? source.background_check_consent),
    titoAcknowledgment: toBoolean(source.titoAcknowledgment ?? source.tito_acknowledgment ?? source.acknowledgeTitoAccuracyUtc),
    siteRulesAcknowledgment: toBoolean(source.siteRulesAcknowledgment ?? source.site_rules_acknowledgment ?? source.acknowledgeSiteRulesSafety),
    workerAgreementConsent: toBoolean(source.workerAgreementConsent ?? source.worker_agreement_consent ?? source.preAcknowledgeAgreementRequired),
    privacyConsent: toBoolean(source.privacyConsent ?? source.privacy_consent ?? source.consentDataProcessing),
    consentToContact: toBoolean(source.consentToContact ?? source.consent_to_contact ?? source.consentOperationalMessages),
    nonSolicitationAcknowledged: toBoolean(source.nonSolicitationAcknowledged ?? source.non_solicitation_acknowledged),
    marketingConsent: toBoolean(source.marketingConsent ?? source.marketing_consent ?? source.promotionalConsent ?? source.promotional_consent),
    independentContractorStatusAcknowledged: toBoolean(source.independentContractorStatusAcknowledged ?? source.independent_contractor_status_acknowledged),
  };
}

const missingPaymentWarnings = new Set<string>();

export function logMissingPaymentIfNeeded(recordId: string | undefined, variant: "worker" | "internal"): void {
  const key = `${recordId || "unknown"}:${variant}`;
  if (missingPaymentWarnings.has(key)) return;
  missingPaymentWarnings.add(key);
  console.warn(`[AGREEMENT_PDF] Payment data missing for record ${recordId || "unknown"} (${variant})`);
}
