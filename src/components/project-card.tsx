import Link from "next/link";
import { ArrowUpRight, CalendarDays, UserRound } from "lucide-react";
import type { Client, Project } from "@/lib/db/schema";
import { formatDate, isOverdue } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/status-badge";
import { UrgencyBadge } from "@/components/urgency-badge";
import { cn } from "@/lib/utils";

export function ProjectCard({
  project,
  client,
  paid,
}: {
  project: Project;
  client: Client | null;
  paid: number;
}) {
  const remaining = Math.max(project.totalAmount - paid, 0);
  const overdue = isOverdue(project.dueDate) && project.status === "active";

  const clientInitial = client?.name
    ? client.name.charAt(0).toUpperCase()
    : "C";

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.status === "completed" ? null : <UrgencyBadge dueDate={project.dueDate} />}
            <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
              {project.code}
            </span>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all duration-200 group-hover:border-border/80 group-hover:bg-muted/60 group-hover:text-foreground">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>

        {/* Project Title & Client Info */}
        <div className="space-y-2">
          <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight text-foreground line-clamp-2 transition-colors group-hover:text-primary">
            {project.name}
          </h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-5.5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {client ? clientInitial : <UserRound className="size-3" />}
            </span>
            <span className="truncate font-medium">
              {client?.name ?? "Tanpa client"}
              {client?.company ? ` · ${client.company}` : ""}
            </span>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-heading font-bold text-foreground tabular-nums">
              {project.progressPercent}%
            </span>
          </div>
          <Progress
            value={project.progressPercent}
            className="h-1.5 bg-muted/80"
          />
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 text-xs">
          <div className="space-y-0.5 rounded-xl border border-border/40 bg-muted/10 p-2 sm:p-2.5">
            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Dibayar
            </p>
            <p className="font-heading text-xs sm:text-sm font-semibold text-foreground truncate tabular-nums">
              {formatMoney(paid, project.currency)}
            </p>
          </div>
          <div className="space-y-0.5 rounded-xl border border-border/40 bg-muted/10 p-2 sm:p-2.5">
            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Sisa Tagihan
            </p>
            <p
              className={cn(
                "font-heading text-xs sm:text-sm font-semibold truncate tabular-nums",
                remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
              )}
            >
              {formatMoney(remaining, project.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Deadline */}
      <div
        className={cn(
          "mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs",
          overdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-muted-foreground",
        )}
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {project.dueDate
            ? `${overdue ? "Lewat deadline:" : "Deadline:"} ${formatDate(project.dueDate)}`
            : "Tanpa deadline"}
        </span>
        {overdue ? (
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Perlu Tindakan
          </span>
        ) : null}
      </div>
    </Link>
  );
}
