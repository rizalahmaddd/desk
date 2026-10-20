import { ArrowUpRight, CalendarDays, Eye, MessageSquare, UserRound } from "lucide-react";
import type { SharedProject } from "@/lib/queries";
import { formatDate, formatRelative, isOverdue } from "@/lib/dates";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/status-badge";
import { UrgencyBadge } from "@/components/urgency-badge";
import { cn } from "@/lib/utils";

export function SharedProjectCard({ item }: { item: SharedProject }) {
  const { project, access, ownerName, lastOpenedAt } = item;
  const overdue = isOverdue(project.dueDate) && project.status === "active";

  return (
    // Plain anchor: the target is a route handler that sets a cookie, so it must not be prefetched.
    <a
      href={`/shared/${project.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.status === "completed" ? null : <UrgencyBadge dueDate={project.dueDate} />}
            {lastOpenedAt ? null : (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                Baru
              </span>
            )}
            {project.archivedAt ? (
              <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Diarsipkan
              </span>
            ) : null}
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all duration-200 group-hover:border-border/80 group-hover:bg-muted/60 group-hover:text-foreground">
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight text-foreground line-clamp-2 transition-colors group-hover:text-primary">
            {project.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-5.5 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-3" />
            </span>
            <span className="truncate font-medium">Dari {ownerName}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-heading font-bold text-foreground tabular-nums">
              {project.progressPercent}%
            </span>
          </div>
          <Progress value={project.progressPercent} className="h-1.5 bg-muted/80" />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {access.scope === "comment" ? (
              <MessageSquare className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {access.scope === "comment" ? "Bisa berdiskusi" : "Hanya melihat"}
          </span>
          {access.expiresAt ? (
            <span>Akses sampai {formatDate(access.expiresAt)}</span>
          ) : null}
          {lastOpenedAt ? <span>Dibuka {formatRelative(lastOpenedAt)}</span> : null}
        </div>
      </div>

      <div
        className={cn(
          "mt-4 flex items-center border-t border-border/60 pt-3 text-xs",
          overdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-muted-foreground",
        )}
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {project.dueDate
            ? `${overdue ? "Lewat deadline:" : "Deadline:"} ${formatDate(project.dueDate)}`
            : "Tanpa deadline"}
        </span>
      </div>
    </a>
  );
}
