import { formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Servers run in UTC; every user-facing date is Indonesian time.
export const APP_TIME_ZONE = "Asia/Jakarta";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
});

const calendarDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

const isoDayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE });

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  // A plain YYYY-MM-DD is a calendar day, not an instant, so it must not shift with time zones.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const day = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(day.getTime()) ? "—" : calendarDateFormatter.format(day);
  }
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatRelative(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: localeId });
}

export function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

export function toISODay(value: Date) {
  return isoDayFormatter.format(value);
}

export function todayISO() {
  return toISODay(new Date());
}

export function isOverdue(value?: string | null) {
  if (!value) return false;
  return value.slice(0, 10) < todayISO();
}

export function daysUntil(value?: string | null) {
  if (!value) return null;
  const diff = parseDate(value).getTime() - parseDate(todayISO()).getTime();
  return Math.ceil(diff / 86_400_000);
}

export type DeadlineUrgency = {
  days: number | null;
  label: string;
  level: "overdue" | "critical" | "warning" | "normal" | "completed" | "flexible";
};

export function getDeadlineUrgency(
  value?: string | null,
  isCompleted?: boolean,
): DeadlineUrgency {
  if (isCompleted) {
    return { days: null, label: "Selesai", level: "completed" };
  }
  if (!value) {
    return { days: null, label: "Fleksibel", level: "flexible" };
  }

  const days = daysUntil(value);
  if (days === null) {
    return { days: null, label: "Fleksibel", level: "flexible" };
  }

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      days,
      label: overdueDays === 1 ? "Lewat 1 hari" : `Lewat ${overdueDays} hari`,
      level: "overdue",
    };
  }

  if (days === 0) {
    return { days, label: "Hari ini!", level: "critical" };
  }

  if (days === 1) {
    return { days, label: "Besok (H-1)", level: "critical" };
  }

  if (days <= 3) {
    return { days, label: `H-${days} (${days} hari)`, level: "critical" };
  }

  if (days <= 7) {
    return { days, label: `H-${days} (${days} hari)`, level: "warning" };
  }

  return { days, label: `${days} hari lagi`, level: "normal" };
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
