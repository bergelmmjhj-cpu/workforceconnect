export interface FriendlyError {
  title?: string;
  message: string;
  hint?: string;
}

interface ErrorContext {
  isLogin?: boolean;
  isSessionExpired?: boolean;
  isValidation?: boolean;
}

const STATUS_MESSAGES: Record<number, FriendlyError> = {
  400: {
    message: "Something went wrong. Please try again.",
  },
  401: {
    message: "We couldn't sign you in. Please check your details and try again.",
  },
  403: {
    message: "You don't have permission to access this feature.",
  },
  404: {
    message: "We couldn't find what you're looking for.",
  },
  409: {
    message: "This already exists. Try a different value.",
  },
  422: {
    message: "Please check the highlighted fields and try again.",
  },
  429: {
    message: "Too many attempts. Please wait a moment and try again.",
  },
  500: {
    message: "Something went wrong on our end. Please try again later.",
  },
  502: {
    message: "Service is temporarily unavailable. Please try again shortly.",
  },
  503: {
    message: "Service is temporarily unavailable. Please try again shortly.",
  },
};

const LOGIN_ERROR: FriendlyError = {
  message: "We couldn't sign you in. Please check your email and password and try again.",
  hint: "Make sure Caps Lock is off.",
};

const SESSION_EXPIRED_ERROR: FriendlyError = {
  message: "Your session has expired. Please sign in again.",
};

const NETWORK_ERROR: FriendlyError = {
  message: "No internet connection. Please check your connection.",
};

const TIMEOUT_ERROR: FriendlyError = {
  message: "This is taking longer than expected. Please retry.",
};

const DEFAULT_ERROR: FriendlyError = {
  message: "Something went wrong. Please try again.",
};

function extractStatusCode(error: unknown): number | null {
  if (error instanceof Error) {
    const message = error.message;
    const statusMatch = message.match(/^(\d{3}):/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }
    const responseStatusMatch = message.match(/status[:\s]+(\d{3})/i);
    if (responseStatusMatch) {
      return parseInt(responseStatusMatch[1], 10);
    }
  }
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.status === "number") return err.status;
    if (typeof err.statusCode === "number") return err.statusCode;
    if (err.response && typeof err.response === "object") {
      const response = err.response as Record<string, unknown>;
      if (typeof response.status === "number") return response.status;
    }
  }
  return null;
}

function extractServerMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const message = error.message;
    const jsonMatch = message.match(/\{.*"error":\s*"([^"]+)".*\}/);
    if (jsonMatch) {
      return jsonMatch[1];
    }
    const colonMatch = message.match(/^\d{3}:\s*(.+)$/);
    if (colonMatch) {
      try {
        const parsed = JSON.parse(colonMatch[1]);
        if (parsed.error) return parsed.error;
        if (parsed.message) return parsed.message;
      } catch {
        return colonMatch[1];
      }
    }
  }
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.error === "string") return err.error;
    if (typeof err.message === "string") return err.message;
    if (err.response && typeof err.response === "object") {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, unknown>;
        if (typeof data.error === "string") return data.error;
        if (typeof data.message === "string") return data.message;
      }
    }
  }
  return null;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("failed to fetch") ||
      message.includes("network request failed") ||
      message.includes("no internet") ||
      message.includes("offline")
    );
  }
  return false;
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("timeout") || message.includes("timed out");
  }
  return false;
}

export function getUserFriendlyError(
  error: unknown,
  context: ErrorContext = {}
): FriendlyError {
  console.error("[Error Handler] Raw error:", error);

  if (isNetworkError(error)) {
    return NETWORK_ERROR;
  }

  if (isTimeoutError(error)) {
    return TIMEOUT_ERROR;
  }

  const statusCode = extractStatusCode(error);
  const serverMessage = extractServerMessage(error);

  console.error("[Error Handler] Status:", statusCode, "Server message:", serverMessage);

  if (context.isLogin || (statusCode === 401 && serverMessage?.toLowerCase().includes("invalid"))) {
    return LOGIN_ERROR;
  }

  if (context.isSessionExpired || (statusCode === 401 && serverMessage?.toLowerCase().includes("expired"))) {
    return SESSION_EXPIRED_ERROR;
  }

  if (statusCode !== null && STATUS_MESSAGES[statusCode]) {
    return STATUS_MESSAGES[statusCode];
  }

  if (statusCode === 401) {
    return LOGIN_ERROR;
  }

  return DEFAULT_ERROR;
}

export function getErrorMessage(error: unknown, context: ErrorContext = {}): string {
  const friendlyError = getUserFriendlyError(error, context);
  return friendlyError.message;
}

export function getLoginErrorMessage(error: unknown): string {
  return getUserFriendlyError(error, { isLogin: true }).message;
}
