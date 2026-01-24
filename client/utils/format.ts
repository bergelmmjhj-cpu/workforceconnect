import { format, formatDistanceToNow, parseISO, isToday, isTomorrow, isYesterday, differenceInHours, differenceInMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function formatDate(dateString: string, timezone: string = "America/Toronto"): string {
  try {
    const date = parseISO(dateString);
    return formatInTimeZone(date, timezone, "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string, timezone: string = "America/Toronto"): string {
  try {
    const date = parseISO(dateString);
    return formatInTimeZone(date, timezone, "h:mm a");
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string, timezone: string = "America/Toronto"): string {
  try {
    const date = parseISO(dateString);
    return formatInTimeZone(date, timezone, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateString;
  }
}

export function formatShiftTime(startTime: string, endTime: string, timezone: string = "America/Toronto"): string {
  try {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const startFormatted = formatInTimeZone(start, timezone, "h:mm a");
    const endFormatted = formatInTimeZone(end, timezone, "h:mm a");
    return `${startFormatted} - ${endFormatted}`;
  } catch {
    return `${startTime} - ${endTime}`;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return `Today at ${format(date, "h:mm a")}`;
    }
    
    if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, "h:mm a")}`;
    }
    
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

export function formatSlaCountdown(deadline: string): { text: string; isUrgent: boolean; isBreach: boolean } {
  try {
    const date = parseISO(deadline);
    const now = new Date();
    const hoursLeft = differenceInHours(date, now);
    const minutesLeft = differenceInMinutes(date, now);
    
    if (minutesLeft <= 0) {
      return { text: "Overdue", isUrgent: true, isBreach: true };
    }
    
    if (hoursLeft < 1) {
      return { text: `${minutesLeft}m left`, isUrgent: true, isBreach: false };
    }
    
    if (hoursLeft < 4) {
      return { text: `${hoursLeft}h left`, isUrgent: true, isBreach: false };
    }
    
    if (hoursLeft < 24) {
      return { text: `${hoursLeft}h left`, isUrgent: false, isBreach: false };
    }
    
    const daysLeft = Math.floor(hoursLeft / 24);
    return { text: `${daysLeft}d left`, isUrgent: false, isBreach: false };
  } catch {
    return { text: "", isUrgent: false, isBreach: false };
  }
}

export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return "Good morning";
  }
  
  if (hour < 17) {
    return "Good afternoon";
  }
  
  return "Good evening";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}
