import {
  MILESTONE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TERM_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type BadgeConfig = {
  container: string;
  dot: string;
};

const projectConfigs: Record<string, BadgeConfig> = {
  draft: {
    container: "bg-muted/70 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground/60",
  },
  active: {
    container: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  on_hold: {
    container: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  completed: {
    container: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    dot: "bg-sky-500",
  },
  cancelled: {
    container: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
};

const paymentConfigs: Record<string, BadgeConfig> = {
  pending: {
    container: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  verified: {
    container: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  rejected: {
    container: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
  refunded: {
    container: "bg-muted/70 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground/60",
  },
};

const termConfigs: Record<string, BadgeConfig> = {
  unpaid: {
    container: "bg-muted/70 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground/60",
  },
  partial: {
    container: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  paid: {
    container: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  overdue: {
    container: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
};

const milestoneConfigs: Record<string, BadgeConfig> = {
  not_started: {
    container: "bg-muted/70 text-muted-foreground border-border/80",
    dot: "bg-muted-foreground/60",
  },
  in_progress: {
    container: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  done: {
    container: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  blocked: {
    container: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
};

function StatusPill({
  label,
  config,
  className,
}: {
  label: string;
  config?: BadgeConfig;
  className?: string;
}) {
  const cfg = config ?? {
    container: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide shadow-2xs select-none",
        cfg.container,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label =
    PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] ?? status;
  return (
    <StatusPill
      label={label}
      config={projectConfigs[status]}
      className={className}
    />
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label =
    PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] ?? status;
  return (
    <StatusPill
      label={label}
      config={paymentConfigs[status]}
      className={className}
    />
  );
}

export function TermStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label =
    PAYMENT_TERM_STATUS_LABELS[status as keyof typeof PAYMENT_TERM_STATUS_LABELS] ??
    status;
  return (
    <StatusPill
      label={label}
      config={termConfigs[status]}
      className={className}
    />
  );
}

export function MilestoneStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label =
    MILESTONE_STATUS_LABELS[status as keyof typeof MILESTONE_STATUS_LABELS] ?? status;
  return (
    <StatusPill
      label={label}
      config={milestoneConfigs[status]}
      className={className}
    />
  );
}
