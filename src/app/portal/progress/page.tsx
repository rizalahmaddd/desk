import { CalendarDays, Clock3, ListChecks } from "lucide-react";
import { MilestoneStatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import { getMilestones } from "@/lib/queries";
import { formatDate, formatRelative, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalProgressPage() {
  const context = await requireShare();
  const db = await getDb();
  const milestones = await getMilestones(db, context.project.id);
  const done = milestones.filter((milestone) => milestone.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Progres & Tahapan Pekerjaan
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Daftar seluruh capaian milestone yang telah diselesaikan maupun yang sedang berlangsung.
        </p>
      </div>

      {/* Progress Summary Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-heading text-sm sm:text-base font-semibold text-foreground">
            Progress Keseluruhan
          </p>
          <span className="font-heading text-2xl font-bold text-foreground tabular-nums">
            {context.project.progressPercent}%
          </span>
        </div>
        <Progress value={context.project.progressPercent} className="h-2.5 bg-muted/80" />
        <p className="text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">{done}</strong> dari {milestones.length} milestone berhasil diselesaikan.
        </p>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center">
          <ListChecks className="mx-auto mb-3 size-8 text-muted-foreground/80" />
          <p className="font-heading text-base font-semibold text-foreground">Belum ada milestone</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Freelancer belum menetapkan rincian milestone untuk project ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const isDone = milestone.status === "done";
            const overdue = isOverdue(milestone.dueDate) && !isDone;

            return (
              <div
                key={milestone.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-2xs transition-colors",
                  isDone
                    ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10"
                    : "border-border/80 bg-card",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <MilestoneStatusBadge status={milestone.status} />
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                          <Clock3 className="size-3" />
                          Lewat Tenggat
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
                      {milestone.title}
                    </h3>

                    {milestone.description ? (
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {milestone.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 space-y-1 text-left sm:text-right pt-1 sm:pt-0">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                      <CalendarDays className="size-3.5" />
                      {milestone.dueDate
                        ? `Target: ${formatDate(milestone.dueDate)}`
                        : "Tanpa tenggat terikat"}
                    </p>
                    {milestone.completedAt ? (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Diselesaikan {formatRelative(milestone.completedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
