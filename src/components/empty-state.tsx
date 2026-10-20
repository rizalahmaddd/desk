import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 sm:p-12 text-center shadow-2xs backdrop-blur-xs",
        className,
      )}
    >
      <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 shadow-xs">
        <Icon className="size-6 text-muted-foreground/80" />
        <span className="absolute -bottom-1 -right-1 size-3 rounded-full bg-primary/20 ring-2 ring-background" />
      </div>

      <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      {description ? (
        <p className="mt-1.5 max-w-sm text-xs sm:text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
