import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const toneClasses = {
    default: {
      icon: "text-muted-foreground bg-muted/60 border-border/80",
      accent: "border-border/80",
    },
    success: {
      icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      accent: "border-emerald-500/20",
    },
    warning: {
      icon: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      accent: "border-amber-500/20",
    },
    danger: {
      icon: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      accent: "border-rose-500/20",
    },
  }[tone];

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-3.5 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
        toneClasses.accent,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-muted-foreground line-clamp-2 leading-snug">
          {label}
        </p>
        <div
          className={cn(
            "flex size-7.5 sm:size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
            toneClasses.icon,
          )}
        >
          <Icon className="size-4 sm:size-4.5" />
        </div>
      </div>

      {/* Sized by the card's own width, not the viewport: a 4-column grid beside the sidebar leaves narrow cards. */}
      <div className="@container mt-3 sm:mt-4 space-y-0.5 sm:space-y-1">
        <div
          className="font-heading text-base @[10rem]:text-xl @[11.5rem]:text-2xl @[15rem]:text-3xl font-bold tracking-tight text-foreground tabular-nums truncate"
          title={value}
        >
          {value}
        </div>
        {hint ? (
          <p className="truncate text-[11px] sm:text-xs text-muted-foreground/90 font-medium">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
