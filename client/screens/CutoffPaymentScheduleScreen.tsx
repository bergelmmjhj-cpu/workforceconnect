import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useStackContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

// ─────────────────────────────────────────────────────────
// 1. DATA  –  All 26 payroll periods for 2026
//    Period 1 begins Dec 27 2025 (Saturday) so that
//    Period 10 aligns with May 2 – May 15 as specified.
// ─────────────────────────────────────────────────────────
interface PeriodData {
  period: number;
  label: string;
  cutoffStart: string; // "YYYY-MM-DD"
  cutoffEnd: string;   // "YYYY-MM-DD"
}

const PERIODS: PeriodData[] = [
  { period: 1,  label: "Dec – Jan",   cutoffStart: "2025-12-27", cutoffEnd: "2026-01-09" },
  { period: 2,  label: "January",     cutoffStart: "2026-01-10", cutoffEnd: "2026-01-23" },
  { period: 3,  label: "Jan – Feb",   cutoffStart: "2026-01-24", cutoffEnd: "2026-02-06" },
  { period: 4,  label: "February",    cutoffStart: "2026-02-07", cutoffEnd: "2026-02-20" },
  { period: 5,  label: "Feb – Mar",   cutoffStart: "2026-02-21", cutoffEnd: "2026-03-06" },
  { period: 6,  label: "March",       cutoffStart: "2026-03-07", cutoffEnd: "2026-03-20" },
  { period: 7,  label: "Mar – Apr",   cutoffStart: "2026-03-21", cutoffEnd: "2026-04-03" },
  { period: 8,  label: "April",       cutoffStart: "2026-04-04", cutoffEnd: "2026-04-17" },
  { period: 9,  label: "Apr – May",   cutoffStart: "2026-04-18", cutoffEnd: "2026-05-01" },
  { period: 10, label: "May",         cutoffStart: "2026-05-02", cutoffEnd: "2026-05-15" },
  { period: 11, label: "May",         cutoffStart: "2026-05-16", cutoffEnd: "2026-05-29" },
  { period: 12, label: "May – Jun",   cutoffStart: "2026-05-30", cutoffEnd: "2026-06-12" },
  { period: 13, label: "June",        cutoffStart: "2026-06-13", cutoffEnd: "2026-06-26" },
  { period: 14, label: "Jun – Jul",   cutoffStart: "2026-06-27", cutoffEnd: "2026-07-10" },
  { period: 15, label: "July",        cutoffStart: "2026-07-11", cutoffEnd: "2026-07-24" },
  { period: 16, label: "Jul – Aug",   cutoffStart: "2026-07-25", cutoffEnd: "2026-08-07" },
  { period: 17, label: "August",      cutoffStart: "2026-08-08", cutoffEnd: "2026-08-21" },
  { period: 18, label: "Aug – Sep",   cutoffStart: "2026-08-22", cutoffEnd: "2026-09-04" },
  { period: 19, label: "September",   cutoffStart: "2026-09-05", cutoffEnd: "2026-09-18" },
  { period: 20, label: "Sep – Oct",   cutoffStart: "2026-09-19", cutoffEnd: "2026-10-02" },
  { period: 21, label: "October",     cutoffStart: "2026-10-03", cutoffEnd: "2026-10-16" },
  { period: 22, label: "October",     cutoffStart: "2026-10-17", cutoffEnd: "2026-10-30" },
  { period: 23, label: "Oct – Nov",   cutoffStart: "2026-10-31", cutoffEnd: "2026-11-13" },
  { period: 24, label: "November",    cutoffStart: "2026-11-14", cutoffEnd: "2026-11-27" },
  { period: 25, label: "Nov – Dec",   cutoffStart: "2026-11-28", cutoffEnd: "2026-12-11" },
  { period: 26, label: "December",    cutoffStart: "2026-12-12", cutoffEnd: "2026-12-25" },
];

// ─────────────────────────────────────────────────────────
// 2. DATE UTILITIES
// ─────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Next Monday strictly after the given date */
function nextMondayAfter(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  // Days until next Monday (always at least 1)
  const diff = day === 0 ? 1 : 8 - day;
  return addDays(d, diff);
}

interface ScheduleDates {
  cutoffStart: Date;
  cutoffEnd: Date;
  scrutinyStart: Date;
  scrutinyEnd: Date;
  releaseStart: Date;
  releaseEnd: Date;
}

function computeSchedule(p: PeriodData): ScheduleDates {
  const cutoffStart = parseDate(p.cutoffStart);
  const cutoffEnd   = parseDate(p.cutoffEnd);
  // Scrutiny: Mon–Fri of the week immediately AFTER cutoff ends (no overlap)
  const scrutinyStart = nextMondayAfter(cutoffEnd);
  const scrutinyEnd   = addDays(scrutinyStart, 4); // Mon → Fri
  // Release: Mon–Fri of the week immediately AFTER scrutiny ends
  const releaseStart = nextMondayAfter(scrutinyEnd);
  const releaseEnd   = addDays(releaseStart, 4); // Mon → Fri
  return { cutoffStart, cutoffEnd, scrutinyStart, scrutinyEnd, releaseStart, releaseEnd };
}

type DayType = "cutoff" | "scrutiny" | "release" | null;

function getDayType(date: Date, schedule: ScheduleDates): DayType {
  const iso = formatDate(date);
  const {
    cutoffStart, cutoffEnd,
    scrutinyStart, scrutinyEnd,
    releaseStart, releaseEnd,
  } = schedule;

  if (iso >= formatDate(releaseStart) && iso <= formatDate(releaseEnd)) {
    return "release";
  }
  if (iso >= formatDate(scrutinyStart) && iso <= formatDate(scrutinyEnd)) {
    return "scrutiny";
  }
  if (iso >= formatDate(cutoffStart) && iso <= formatDate(cutoffEnd)) {
    return "cutoff";
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// 3. MONTH CALENDAR COMPONENT
// ─────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface MonthCalendarProps {
  year: number;
  month: number; // 0-based
  schedule: ScheduleDates;
  todayIso: string;
}

function MonthCalendar({ year, month, schedule, todayIso }: MonthCalendarProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  // Calendar grid dimensions
  const calendarPadding = Spacing.lg * 2;
  const calendarWidth = Math.min(width - calendarPadding, 380);
  const cellSize = Math.floor((calendarWidth - 12) / 7); // 6px gap total

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  function cellStyle(day: number | null): {
    bg: string;
    textColor: string;
    isToday: boolean;
    dayType: DayType;
  } {
    if (!day) return { bg: "transparent", textColor: theme.textMuted, isToday: false, dayType: null };

    const dateObj = new Date(year, month, day);
    const iso = formatDate(dateObj);
    const isToday = iso === todayIso;
    const dayType = getDayType(dateObj, schedule);

    let bg = "transparent";
    let textColor = theme.text;

    if (dayType === "release") {
      bg = "#10B981";
      textColor = "#FFFFFF";
    } else if (dayType === "scrutiny") {
      bg = "#F59E0B";
      textColor = "#FFFFFF";
    } else if (dayType === "cutoff") {
      bg = "#3B82F6";
      textColor = "#FFFFFF";
    }

    return { bg, textColor, isToday, dayType };
  }

  return (
    <View style={[styles.monthBlock, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText type="h4" style={styles.monthTitle}>
        {MONTH_NAMES[month]} {year}
      </ThemedText>

      {/* Day headers */}
      <View style={styles.calendarRow}>
        {DAY_LABELS.map((label) => (
          <View
            key={label}
            style={[styles.dayHeader, { width: cellSize, height: cellSize }]}
          >
            <ThemedText style={[styles.dayHeaderText, { color: theme.textSecondary }]}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Day rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calendarRow}>
          {row.map((day, ci) => {
            const { bg, textColor, isToday, dayType } = cellStyle(day);
            return (
              <View
                key={ci}
                style={[
                  styles.dayCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: bg,
                    borderRadius: cellSize / 2,
                    borderWidth: isToday ? 2 : 0,
                    borderColor: isToday
                      ? dayType
                        ? "#FFFFFF"
                        : theme.primary
                      : "transparent",
                  },
                ]}
              >
                {day ? (
                  <ThemedText
                    style={[
                      styles.dayCellText,
                      {
                        color: textColor,
                        fontWeight: isToday ? "700" : "400",
                      },
                    ]}
                  >
                    {day}
                  </ThemedText>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// 4. MAIN SCREEN
// ─────────────────────────────────────────────────────────
export default function CutoffPaymentScheduleScreen() {
  const { theme } = useTheme();
  const { paddingBottom } = useStackContentPadding();

  // Default to the period nearest today
  const todayIso = formatDate(new Date());
  const defaultPeriod = useMemo(() => {
    const idx = PERIODS.findIndex((p) => p.cutoffEnd >= todayIso);
    return idx >= 0 ? idx : PERIODS.length - 1;
  }, [todayIso]);

  const [selectedIndex, setSelectedIndex] = useState(defaultPeriod);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const selected = PERIODS[selectedIndex];
  const schedule = useMemo(() => computeSchedule(selected), [selectedIndex]);

  // Determine which months to show (cutoff + scrutiny + release months)
  const monthsToShow = useMemo(() => {
    const months = new Set<string>();
    const addMonth = (d: Date) =>
      months.add(`${d.getFullYear()}-${d.getMonth()}`);
    addMonth(schedule.cutoffStart);
    addMonth(schedule.cutoffEnd);
    addMonth(schedule.scrutinyEnd);
    addMonth(schedule.releaseEnd);
    return Array.from(months).map((key) => {
      const [y, m] = key.split("-").map(Number);
      return { year: y, month: m };
    });
  }, [schedule]);

  // Human-readable date formatter
  function fmtDate(d: Date) {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }

  const cutoffRange   = `${fmtDate(schedule.cutoffStart)} – ${fmtDate(schedule.cutoffEnd)}`;
  const scrutinyRange = `${fmtDate(schedule.scrutinyStart)} – ${fmtDate(schedule.scrutinyEnd)}`;
  const releaseRange  = `${fmtDate(schedule.releaseStart)} – ${fmtDate(schedule.releaseEnd)}`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: paddingBottom + Spacing["3xl"] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerIconRow}>
          <View style={styles.headerIcon}>
            <Feather name="calendar" size={28} color="#FFFFFF" />
          </View>
        </View>
        <ThemedText style={styles.headerTitle}>
          Cutoff & Payment Schedule
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Understand when your work is counted and when payment may be released
        </ThemedText>
        <ThemedText style={styles.headerYear}>2026 Period Guide</ThemedText>
      </View>

      {/* ── PERIOD SELECTOR ── */}
      <View style={styles.section}>
        <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
          Select Period
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodScrollContent}
        >
          {PERIODS.map((p, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <Pressable
                key={p.period}
                onPress={() => setSelectedIndex(idx)}
                style={[
                  styles.periodChip,
                  {
                    backgroundColor: isActive ? theme.primary : theme.backgroundDefault,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.periodChipNum,
                    { color: isActive ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  P{p.period}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.periodChipLabel,
                    { color: isActive ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {p.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Selected period detail */}
        <View
          style={[
            styles.selectedPeriodBanner,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <Feather name="info" size={16} color={theme.primary} />
          <ThemedText style={[styles.selectedPeriodText, { color: theme.text }]}>
            {"  "}
            <ThemedText style={{ fontWeight: "700", color: theme.primary }}>
              Period {selected.period}
            </ThemedText>
            {" – "}
            {selected.cutoffStart === "2025-12-27"
              ? "Dec 27 2025"
              : fmtDate(schedule.cutoffStart)}{" "}
            to {fmtDate(schedule.cutoffEnd)}
          </ThemedText>
        </View>
      </View>

      {/* ── VIEW MODE TOGGLE ── */}
      <View style={styles.section}>
        <View
          style={[
            styles.toggleRow,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          {(["calendar", "list"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[
                styles.toggleBtn,
                viewMode === mode && { backgroundColor: theme.primary },
              ]}
            >
              <Feather
                name={mode === "calendar" ? "grid" : "list"}
                size={14}
                color={viewMode === mode ? "#FFFFFF" : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.toggleBtnText,
                  { color: viewMode === mode ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                {mode === "calendar" ? " Calendar" : " List"}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── CALENDAR VIEW ── */}
      {viewMode === "calendar" && (
        <View style={styles.section}>
          <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
            Visual Calendar
          </ThemedText>

          {/* Legend */}
          <View style={[styles.legendRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            {[
              { color: "#3B82F6", label: "Cutoff" },
              { color: "#F59E0B", label: "Scrutiny" },
              { color: "#10B981", label: "Release" },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <ThemedText style={[styles.legendText, { color: theme.textSecondary }]}>
                  {label}
                </ThemedText>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 2,
                    borderColor: theme.primary,
                  },
                ]}
              />
              <ThemedText style={[styles.legendText, { color: theme.textSecondary }]}>
                Today
              </ThemedText>
            </View>
          </View>

          {/* Month grids */}
          {monthsToShow.map(({ year, month }) => (
            <MonthCalendar
              key={`${year}-${month}`}
              year={year}
              month={month}
              schedule={schedule}
              todayIso={todayIso}
            />
          ))}
        </View>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <View style={styles.section}>
          <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
            All Periods — 2026
          </ThemedText>
          {PERIODS.map((p, idx) => {
            const s = computeSchedule(p);
            const isActive = idx === selectedIndex;
            const isCurrentPeriod =
              todayIso >= p.cutoffStart && todayIso <= p.cutoffEnd;
            return (
              <Pressable
                key={p.period}
                onPress={() => {
                  setSelectedIndex(idx);
                  setViewMode("calendar");
                }}
                style={[
                  styles.listRow,
                  {
                    backgroundColor: isActive
                      ? theme.primary + "18"
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.listPeriodBadge,
                    { backgroundColor: isActive ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.listPeriodBadgeText,
                      { color: isActive ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {p.period}
                  </ThemedText>
                </View>
                <View style={styles.listRowContent}>
                  <View style={styles.listRowHeader}>
                    <ThemedText
                      style={[styles.listRowLabel, { color: theme.text }]}
                    >
                      Period {p.period} – {p.label}
                    </ThemedText>
                    {isCurrentPeriod && (
                      <View
                        style={[
                          styles.todayBadge,
                          { backgroundColor: theme.success + "22" },
                        ]}
                      >
                        <ThemedText
                          style={[styles.todayBadgeText, { color: theme.success }]}
                        >
                          Current
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText
                    style={[styles.listRowDate, { color: theme.textSecondary }]}
                  >
                    Cutoff: {fmtDate(s.cutoffStart)} – {fmtDate(s.cutoffEnd)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.listRowDate, { color: theme.textMuted }]}
                  >
                    Release: {fmtDate(s.releaseStart)} – {fmtDate(s.releaseEnd)}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── EXPLANATION CARDS ── */}
      <View style={styles.section}>
        <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
          Period {selected.period} Breakdown
        </ThemedText>

        {/* Card 1 – Cutoff */}
        <View
          style={[
            styles.explainCard,
            { backgroundColor: theme.backgroundDefault, borderLeftColor: "#3B82F6" },
          ]}
        >
          <View style={styles.explainCardHeader}>
            <View style={[styles.explainDot, { backgroundColor: "#3B82F6" }]} />
            <ThemedText
              style={[styles.explainCardTitle, { color: "#3B82F6" }]}
            >
              Cutoff Period (Work Completed)
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.explainCardDate, { color: theme.text }]}
          >
            {cutoffRange}
          </ThemedText>
          <ThemedText
            style={[styles.explainCardBody, { color: theme.textSecondary }]}
          >
            All work completed during this period is recorded and included for
            processing.
          </ThemedText>
        </View>

        {/* Card 2 – Scrutiny */}
        <View
          style={[
            styles.explainCard,
            { backgroundColor: theme.backgroundDefault, borderLeftColor: "#F59E0B" },
          ]}
        >
          <View style={styles.explainCardHeader}>
            <View style={[styles.explainDot, { backgroundColor: "#F59E0B" }]} />
            <ThemedText
              style={[styles.explainCardTitle, { color: "#F59E0B" }]}
            >
              Scrutiny Period (Review & Processing)
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.explainCardDate, { color: theme.text }]}
          >
            {scrutinyRange}
            <ThemedText style={[styles.explainCardNote, { color: theme.textMuted }]}>
              {"  "}(Mon – Fri after cutoff)
            </ThemedText>
          </ThemedText>
          <ThemedText
            style={[styles.explainCardBody, { color: theme.textSecondary }]}
          >
            Timesheets are reviewed, verified, and prepared by accounting.
          </ThemedText>
        </View>

        {/* Card 3 – Release */}
        <View
          style={[
            styles.explainCard,
            { backgroundColor: theme.backgroundDefault, borderLeftColor: "#10B981" },
          ]}
        >
          <View style={styles.explainCardHeader}>
            <View style={[styles.explainDot, { backgroundColor: "#10B981" }]} />
            <ThemedText
              style={[styles.explainCardTitle, { color: "#10B981" }]}
            >
              Releasing Week (Payment Issued)
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.explainCardDate, { color: theme.text }]}
          >
            {releaseRange}
          </ThemedText>
          <ThemedText
            style={[styles.explainCardBody, { color: theme.textSecondary }]}
          >
            Payment may be issued during this week, subject to client
            remittance, banking timelines, and operational processing.
          </ThemedText>
        </View>
      </View>

      {/* ── PAYROLL FLOW ── */}
      <View style={styles.section}>
        <ThemedText type="h3" style={[styles.sectionTitle, { color: theme.text }]}>
          Payroll Flow
        </ThemedText>
        <View
          style={[
            styles.flowCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          {[
            { icon: "briefcase" as const, color: "#3B82F6", label: "Work Completed", sub: "Cutoff period" },
            { icon: "search"    as const, color: "#F59E0B", label: "Reviewed",        sub: "Scrutiny period" },
            { icon: "dollar-sign" as const, color: "#10B981", label: "Payment Released", sub: "Release week" },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.label}>
              <View style={styles.flowStep}>
                <View style={[styles.flowIcon, { backgroundColor: step.color + "20" }]}>
                  <Feather name={step.icon} size={22} color={step.color} />
                </View>
                <ThemedText style={[styles.flowLabel, { color: theme.text }]}>
                  {step.label}
                </ThemedText>
                <ThemedText style={[styles.flowSub, { color: theme.textMuted }]}>
                  {step.sub}
                </ThemedText>
              </View>
              {idx < arr.length - 1 && (
                <View style={styles.flowArrow}>
                  <Feather name="arrow-right" size={20} color={theme.textMuted} />
                </View>
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── LEGAL NOTICE ── */}
      <View style={styles.section}>
        <View
          style={[
            styles.legalCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.legalHeader}>
            <Feather name="alert-circle" size={18} color={theme.warning} />
            <ThemedText
              style={[styles.legalTitle, { color: theme.text }]}
            >
              {"  "}Important Notice
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.legalBody, { color: theme.textSecondary }]}
          >
            Payment timing is an estimate only and not guaranteed. Workforce
            Connect issues payments based on client remittance. In cases of
            delayed, partial, or non-payment by clients, contractor payments
            may be delayed or adjusted accordingly.
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────
// 5. STYLES
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing["2xl"],
    alignItems: "center",
  },
  headerIconRow: {
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  headerYear: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },

  // Period selector
  periodScrollContent: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  periodChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 64,
  },
  periodChipNum: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  periodChipLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  selectedPeriodBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  selectedPeriodText: {
    fontSize: 15,
    flex: 1,
    flexWrap: "wrap",
  },

  // View mode toggle
  toggleRow: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 4,
    alignSelf: "flex-start",
    gap: 4,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Calendar / month block
  monthBlock: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  monthTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  dayHeader: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellText: {
    fontSize: 13,
  },

  // Legend
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Explanation cards
  explainCard: {
    borderLeftWidth: 4,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  explainCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  explainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  explainCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    flexWrap: "wrap",
  },
  explainCardDate: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  explainCardNote: {
    fontSize: 12,
    fontWeight: "400",
  },
  explainCardBody: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Payroll flow
  flowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  flowStep: {
    flex: 1,
    alignItems: "center",
  },
  flowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  flowLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  flowSub: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  flowArrow: {
    paddingHorizontal: 2,
    marginBottom: Spacing["2xl"],
  },

  // Legal notice
  legalCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  legalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  legalTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  legalBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  // List view
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  listPeriodBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  listPeriodBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listRowContent: {
    flex: 1,
  },
  listRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  listRowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  listRowDate: {
    fontSize: 12,
  },
  todayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
