// 2026 Bi-Weekly Pay Periods Configuration
// All dates are in local time (Canada Eastern)

export interface PayPeriod {
  year: number;
  periodNumber: number;
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  label: string;
}

export const PAY_PERIODS_2026: PayPeriod[] = [
  { year: 2026, periodNumber: 1, startDate: "2025-12-27", endDate: "2026-01-09", label: "Period 1 (Dec 27 - Jan 9)" },
  { year: 2026, periodNumber: 2, startDate: "2026-01-10", endDate: "2026-01-23", label: "Period 2 (Jan 10 - Jan 23)" },
  { year: 2026, periodNumber: 3, startDate: "2026-01-24", endDate: "2026-02-06", label: "Period 3 (Jan 24 - Feb 6)" },
  { year: 2026, periodNumber: 4, startDate: "2026-02-07", endDate: "2026-02-20", label: "Period 4 (Feb 7 - Feb 20)" },
  { year: 2026, periodNumber: 5, startDate: "2026-02-21", endDate: "2026-03-06", label: "Period 5 (Feb 21 - Mar 6)" },
  { year: 2026, periodNumber: 6, startDate: "2026-03-07", endDate: "2026-03-20", label: "Period 6 (Mar 7 - Mar 20)" },
  { year: 2026, periodNumber: 7, startDate: "2026-03-21", endDate: "2026-04-03", label: "Period 7 (Mar 21 - Apr 3)" },
  { year: 2026, periodNumber: 8, startDate: "2026-04-04", endDate: "2026-04-17", label: "Period 8 (Apr 4 - Apr 17)" },
  { year: 2026, periodNumber: 9, startDate: "2026-04-18", endDate: "2026-05-01", label: "Period 9 (Apr 18 - May 1)" },
  { year: 2026, periodNumber: 10, startDate: "2026-05-02", endDate: "2026-05-15", label: "Period 10 (May 2 - May 15)" },
  { year: 2026, periodNumber: 11, startDate: "2026-05-16", endDate: "2026-05-29", label: "Period 11 (May 16 - May 29)" },
  { year: 2026, periodNumber: 12, startDate: "2026-05-30", endDate: "2026-06-12", label: "Period 12 (May 30 - Jun 12)" },
  { year: 2026, periodNumber: 13, startDate: "2026-06-13", endDate: "2026-06-26", label: "Period 13 (Jun 13 - Jun 26)" },
  { year: 2026, periodNumber: 14, startDate: "2026-06-27", endDate: "2026-07-10", label: "Period 14 (Jun 27 - Jul 10)" },
  { year: 2026, periodNumber: 15, startDate: "2026-07-11", endDate: "2026-07-24", label: "Period 15 (Jul 11 - Jul 24)" },
  { year: 2026, periodNumber: 16, startDate: "2026-07-25", endDate: "2026-08-07", label: "Period 16 (Jul 25 - Aug 7)" },
  { year: 2026, periodNumber: 17, startDate: "2026-08-08", endDate: "2026-08-21", label: "Period 17 (Aug 8 - Aug 21)" },
  { year: 2026, periodNumber: 18, startDate: "2026-08-22", endDate: "2026-09-04", label: "Period 18 (Aug 22 - Sep 4)" },
  { year: 2026, periodNumber: 19, startDate: "2026-09-05", endDate: "2026-09-18", label: "Period 19 (Sep 5 - Sep 18)" },
  { year: 2026, periodNumber: 20, startDate: "2026-09-19", endDate: "2026-10-02", label: "Period 20 (Sep 19 - Oct 2)" },
  { year: 2026, periodNumber: 21, startDate: "2026-10-03", endDate: "2026-10-16", label: "Period 21 (Oct 3 - Oct 16)" },
  { year: 2026, periodNumber: 22, startDate: "2026-10-17", endDate: "2026-10-30", label: "Period 22 (Oct 17 - Oct 30)" },
  { year: 2026, periodNumber: 23, startDate: "2026-10-31", endDate: "2026-11-13", label: "Period 23 (Oct 31 - Nov 13)" },
  { year: 2026, periodNumber: 24, startDate: "2026-11-14", endDate: "2026-11-27", label: "Period 24 (Nov 14 - Nov 27)" },
  { year: 2026, periodNumber: 25, startDate: "2026-11-28", endDate: "2026-12-11", label: "Period 25 (Nov 28 - Dec 11)" },
  { year: 2026, periodNumber: 26, startDate: "2026-12-12", endDate: "2026-12-25", label: "Period 26 (Dec 12 - Dec 25)" },
];

// Get all periods for a given year
export function getPayPeriodsForYear(year: number): PayPeriod[] {
  if (year === 2026) {
    return PAY_PERIODS_2026;
  }
  return [];
}

// Get a specific period
export function getPayPeriod(year: number, periodNumber: number): PayPeriod | undefined {
  const periods = getPayPeriodsForYear(year);
  return periods.find(p => p.periodNumber === periodNumber);
}

// Get current pay period based on date
export function getCurrentPayPeriod(date: Date = new Date()): PayPeriod | undefined {
  const dateStr = date.toISOString().slice(0, 10);
  const year = date.getFullYear();
  
  // Check current year and previous year (for Period 1 which starts in Dec)
  const yearsToCheck = [year, year + 1];
  
  for (const y of yearsToCheck) {
    const periods = getPayPeriodsForYear(y);
    for (const period of periods) {
      if (dateStr >= period.startDate && dateStr <= period.endDate) {
        return period;
      }
    }
  }
  
  return undefined;
}
