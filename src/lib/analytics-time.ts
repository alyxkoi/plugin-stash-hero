import { centralInputToUtcDate, SALE_TIME_ZONE } from "@/lib/sale-time";

export type DashboardRange = "today" | "7d" | "30d" | "mtd";

export const DASHBOARD_RANGE_LABEL: Record<DashboardRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  mtd: "Month to date",
};

type CalendarDate = { year: number; month: number; day: number };

const chicagoDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SALE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function calendarDateInChicago(date: Date): CalendarDate {
  const parts = Object.fromEntries(
    chicagoDateFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function shiftCalendarDate(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function chicagoMidnight(date: CalendarDate): Date {
  const pad = (value: number) => String(value).padStart(2, "0");
  const result = centralInputToUtcDate(
    `${date.year}-${pad(date.month)}-${pad(date.day)}T00:00:00`,
    SALE_TIME_ZONE,
  );
  if (!result) throw new Error("Unable to resolve Chicago date boundary.");
  return result;
}

export function startOfChicagoDay(reference = new Date()): Date {
  return chicagoMidnight(calendarDateInChicago(reference));
}

export function chicagoComparisonBounds(range: DashboardRange, reference = new Date()) {
  const currentEnd = new Date(reference);
  const today = calendarDateInChicago(currentEnd);
  let startDate = today;

  if (range === "7d") startDate = shiftCalendarDate(today, -6);
  if (range === "30d") startDate = shiftCalendarDate(today, -29);
  if (range === "mtd") startDate = { ...today, day: 1 };

  const currentStart = chicagoMidnight(startDate);
  const duration = Math.max(1, currentEnd.getTime() - currentStart.getTime());
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { currentStart, currentEnd, previousStart, previousEnd };
}
