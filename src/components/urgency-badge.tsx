import { AlertCircle, AlertTriangle, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { getDeadlineUrgency } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function UrgencyBadge({
  dueDate,
  isCompleted,
  className,
  showIcon = true,
}: {
  dueDate?: string | null;
  isCompleted?: boolean;
  className?: string;
  showIcon?: boolean;
}) {
  const urgency = getDeadlineUrgency(dueDate, isCompleted);

  if (urgency.level === "flexible") {
    return null;
  }

  let style = "bg-muted/70 text-muted-foreground border-border/80";
  let Icon = CalendarDays;

  switch (urgency.level) {
    case "completed":
      style = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      Icon = CheckCircle2;
      break;
    case "overdue":
      style = "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 animate-pulse";
      Icon = AlertCircle;
      break;
    case "critical":
      style = "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30";
      Icon = AlertTriangle;
      break;
    case "warning":
      style = "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/25";
      Icon = Clock;
      break;
    case "normal":
      style = "bg-muted/60 text-muted-foreground border-border/60";
      Icon = Clock;
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium tracking-tight shadow-2xs select-none",
        style,
        className,
      )}
    >
      {showIcon ? <Icon className="size-3 shrink-0" /> : null}
      <span>{urgency.label}</span>
    </span>
  );
}
