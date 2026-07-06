export const SALE_TIME_ZONE = "America/Chicago";

export type LiveSaleStatus = "draft" | "scheduled" | "active" | "ended";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parseDateTimeLocal(value: string): DateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
}

function partsInZone(utcMs: number, timeZone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values = Object.fromEntries(formatter.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const p = partsInZone(utcMs, timeZone);
  const zoneAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return zoneAsUtc - utcMs;
}

export function centralInputToUtcDate(value: string, timeZone = SALE_TIME_ZONE): Date | null {
  const p = parseDateTimeLocal(value);
  if (!p) return null;
  const localWallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let utcMs = localWallClockAsUtc - zoneOffsetMs(localWallClockAsUtc, timeZone);
  utcMs = localWallClockAsUtc - zoneOffsetMs(utcMs, timeZone);
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function centralInputToUtcIso(value: string, timeZone = SALE_TIME_ZONE): string {
  const date = centralInputToUtcDate(value, timeZone);
  if (!date) throw new Error("Invalid date/time.");
  return date.toISOString();
}

export function isoToCentralInput(iso: string | null | undefined, timeZone = SALE_TIME_ZONE): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = partsInZone(date.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatInSaleTimeZone(iso: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    timeZone: SALE_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  });
}

export function deriveSaleStatus(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  storedStatus?: string | null,
  nowMs = Date.now(),
): LiveSaleStatus {
  if (storedStatus === "draft") return "draft";
  const startMs = startAt ? new Date(startAt).getTime() : Number.NaN;
  const endMs = endAt ? new Date(endAt).getTime() : Number.NaN;
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "draft";
  if (nowMs < startMs) return "scheduled";
  if (nowMs <= endMs) return "active";
  return "ended";
}