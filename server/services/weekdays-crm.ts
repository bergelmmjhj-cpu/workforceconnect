const CRM_BASE_URL = "https://weekdays.wfconnect.org";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export interface CrmPosition {
  id: string;
  title: string;
  description?: string;
}

export interface CrmWorkplace {
  id: string;
  teamId: string;
  name: string;
  location: string;
  address: string;
  notes?: string;
  contactPerson?: string;
  latitude?: number;
  longitude?: number;
  province?: string;
  isActive: boolean;
  payRate?: number;
  jobPosition?: string;
  hiringStatus?: string;
  positions?: CrmPosition[];
}

export interface CrmConfirmedShiftRequest {
  hotelName: string;
  roleNeeded: string;
  location: string;
  address: string;
}

export interface CrmConfirmedShift {
  id: string;
  teamId: string;
  requestId: string;
  staffUserId: string;
  quoContactNameSnapshot?: string;
  quoContactPhoneSnapshot?: string;
  confirmStatus: "CONFIRMED" | "COMPLETED";
  scheduledStartAt: string;
  scheduledEndAt: string;
  confirmedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  request: CrmConfirmedShiftRequest;
}

export interface CrmHotelRequest {
  id: string;
  teamId: string;
  hotelName: string;
  location: string;
  address: string;
  roleNeeded: string;
  quantityNeeded: number;
  shiftStartAt: string;
  shiftEndAt: string;
  payRate?: number;
  notes?: string;
  status: "NEW" | "CONFIRMED";
  isMultiDay?: boolean;
  scheduleType?: string;
  confirmedCount?: number;
  isDeleted?: boolean;
}

export interface CrmDutySlot {
  userId: string;
  dutyMode: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: string;
  user: {
    displayName: string;
    avatarColor?: string;
  };
}

export interface CrmDutyDay {
  id: string;
  teamId: string;
  date: string;
  notes?: string;
  slots: CrmDutySlot[];
}

export interface CrmBoard {
  id: string;
  name: string;
  teamId: string;
  [key: string]: unknown;
}

interface CrmApiError extends Error {
  statusCode?: number;
  isRetryable: boolean;
}

function createCrmError(message: string, statusCode?: number): CrmApiError {
  const error = new Error(message) as CrmApiError;
  error.statusCode = statusCode;
  error.isRetryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 408 || statusCode === 429);
  return error;
}

function getApiKey(): string {
  const key = process.env.WEEKDAYS_API_KEY;
  if (!key) {
    throw createCrmError("WEEKDAYS_API_KEY environment variable is not set");
  }
  return key;
}

function getTeamId(): string {
  const teamId = process.env.WEEKDAYS_TEAM_ID;
  if (!teamId) {
    throw createCrmError("WEEKDAYS_TEAM_ID environment variable is not set");
  }
  return teamId;
}

export function isConfigured(): boolean {
  return !!(process.env.WEEKDAYS_API_KEY && process.env.WEEKDAYS_TEAM_ID);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(path, CRM_BASE_URL).toString();

  let lastError: CrmApiError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const error = createCrmError(
          `CRM API ${response.status}: ${body || response.statusText}`,
          response.status
        );

        if (!error.isRetryable || attempt === MAX_RETRIES - 1) {
          throw error;
        }

        lastError = error;
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[CRM] Retryable error on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${backoff}ms: ${error.message}`);
        await sleep(backoff);
        continue;
      }

      return await response.json() as T;
    } catch (err: any) {
      if (err.name === "AbortError") {
        lastError = createCrmError("CRM API request timed out", 408);
        lastError.isRetryable = true;
      } else if (err.isRetryable !== undefined) {
        lastError = err;
      } else {
        lastError = createCrmError(err.message || "Unknown network error");
        lastError.isRetryable = true;
      }

      if (!lastError!.isRetryable || attempt === MAX_RETRIES - 1) {
        throw lastError!;
      }

      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`[CRM] Error on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${backoff}ms: ${lastError!.message}`);
      await sleep(backoff);
    }
  }

  throw lastError ?? createCrmError("All retry attempts exhausted");
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    if (!isConfigured()) {
      return { connected: false, error: "CRM environment variables not configured" };
    }
    const teamId = getTeamId();
    await fetchWithRetry<unknown>(`/api/teams/${teamId}/workplaces?limit=1`);
    return { connected: true };
  } catch (err: any) {
    console.error("[CRM] Connection test failed:", err.message);
    return { connected: false, error: err.message };
  }
}

export async function getWorkplaces(): Promise<CrmWorkplace[]> {
  const teamId = getTeamId();
  const data = await fetchWithRetry<CrmWorkplace[] | { data: CrmWorkplace[] }>(
    `/api/teams/${teamId}/workplaces`
  );
  return Array.isArray(data) ? data : (data.data || []);
}

export async function getConfirmedShifts(): Promise<CrmConfirmedShift[]> {
  const teamId = getTeamId();
  const data = await fetchWithRetry<CrmConfirmedShift[] | { data: CrmConfirmedShift[] }>(
    `/api/teams/${teamId}/confirmed-shifts`
  );
  return Array.isArray(data) ? data : (data.data || []);
}

export async function getHotelRequests(): Promise<CrmHotelRequest[]> {
  const teamId = getTeamId();
  const data = await fetchWithRetry<CrmHotelRequest[] | { data: CrmHotelRequest[] }>(
    `/api/teams/${teamId}/hotel-requests`
  );
  return Array.isArray(data) ? data : (data.data || []);
}

export async function getDutyDays(): Promise<CrmDutyDay[]> {
  const teamId = getTeamId();
  const data = await fetchWithRetry<CrmDutyDay[] | { data: CrmDutyDay[] }>(
    `/api/teams/${teamId}/duty-days`
  );
  return Array.isArray(data) ? data : (data.data || []);
}

export async function getBoards(): Promise<CrmBoard[]> {
  const teamId = getTeamId();
  const data = await fetchWithRetry<CrmBoard[] | { data: CrmBoard[] }>(
    `/api/teams/${teamId}/boards`
  );
  return Array.isArray(data) ? data : (data.data || []);
}

export async function getBoard(boardId: string): Promise<CrmBoard> {
  const teamId = getTeamId();
  return await fetchWithRetry<CrmBoard>(
    `/api/teams/${teamId}/boards/${boardId}`
  );
}

export interface CreateCrmWorkplaceInput {
  name: string;
  address?: string;
  location?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
}

export async function createCrmWorkplace(input: CreateCrmWorkplaceInput): Promise<CrmWorkplace> {
  const teamId = getTeamId();
  const body = {
    name: input.name,
    address: input.address || "",
    location: input.location || "",
    province: input.province || "",
    latitude: input.latitude,
    longitude: input.longitude,
    contactPerson: input.contactPerson || "",
    notes: input.notes || "",
    isActive: input.isActive !== false,
  };

  console.log(`[CRM-SYNC] Creating workplace in CRM: "${input.name}"`);
  const result = await fetchWithRetry<CrmWorkplace>(
    `/api/teams/${teamId}/workplaces`,
    { method: "POST", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Workplace created in CRM: "${input.name}" → ID ${result.id}`);
  return result;
}

export interface UpdateCrmWorkplaceInput {
  name?: string;
  address?: string;
  location?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
}

export async function updateCrmWorkplace(crmId: string, input: UpdateCrmWorkplaceInput): Promise<CrmWorkplace> {
  const teamId = getTeamId();
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.address !== undefined) body.address = input.address;
  if (input.location !== undefined) body.location = input.location;
  if (input.province !== undefined) body.province = input.province;
  if (input.latitude !== undefined) body.latitude = input.latitude;
  if (input.longitude !== undefined) body.longitude = input.longitude;
  if (input.contactPerson !== undefined) body.contactPerson = input.contactPerson;
  if (input.notes !== undefined) body.notes = input.notes;
  if (input.isActive !== undefined) body.isActive = input.isActive;

  console.log(`[CRM-SYNC] Updating workplace in CRM: ID ${crmId}`);
  const result = await fetchWithRetry<CrmWorkplace>(
    `/api/teams/${teamId}/workplaces/${crmId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  console.log(`[CRM-SYNC] Workplace updated in CRM: ID ${crmId}`);
  return result;
}
