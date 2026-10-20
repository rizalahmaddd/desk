import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Flag,
  ListChecks,
  Milestone as MilestoneIcon,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { Milestone, Project } from "@/lib/db/schema";
import { formatDate, isOverdue, daysUntil } from "@/lib/dates";
import { MilestoneStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getDaysRemainingBadge(dueDate?: string | null, status?: string) {
  if (status === "done") {
    return {
      text: "Selesai",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (!dueDate) {
    return {
      text: "Tanpa deadline",
      className: "border-border/60 bg-muted/40 text-muted-foreground",
    };
  }
  const days = daysUntil(dueDate);
  if (days === null) {
    return {
      text: formatDate(dueDate),
      className: "border-border/60 bg-muted/40 text-muted-foreground",
    };
  }
  if (days < 0) {
    return {
      text: `Lewat ${Math.abs(days)} hari`,
      className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold",
    };
  }
  if (days === 0) {
    return {
      text: "Deadline hari ini",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold",
    };
  }
  if (days <= 3) {
    return {
      text: `Sisa ${days} hari`,
      className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }
  return {
    text: `Sisa ${days} hari`,
    className: "border-border/60 bg-muted/30 text-muted-foreground",
  };
}

export function ProjectTimelineRoadmap({
  project,
  milestones,
  compact = false,
}: {
  project: Project;
  milestones: Milestone[];
  compact?: boolean;
}) {
  const completedCount = milestones.filter((m) => m.status === "done").length;
  const overdueProject = isOverdue(project.dueDate) && project.status === "active";

  if (milestones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-center space-y-3">
        <MilestoneIcon className="mx-auto size-8 text-muted-foreground/70" />
        <div className="space-y-1">
          <p className="font-heading text-sm font-semibold text-foreground">
            Timeline Belum Diatur
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tambahkan milestone pertama untuk membentuk roadmap dan visualisasi timeline pengerjaan project.
          </p>
        </div>
        <Button asChild size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-xs">
          <Link href={`/projects/${project.id}/milestones`}>
            <ListChecks className="size-3.5" />
            <span>Tambah Milestone Sekarang</span>
          </Link>
        </Button>
      </div>
    );
  }

  // Compact View for Dashboard / Project Overview
  if (compact) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-3.5" />
              </span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Roadmap & Timeline Milestone
              </h3>
            </div>
            <p className="text-xs text-muted-foreground pl-9">
              {completedCount} dari {milestones.length} milestone rampung ({project.progressPercent}%)
            </p>
          </div>

          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl self-start sm:self-auto">
            <Link href={`/projects/${project.id}/timeline`}>
              <span>Lihat Timeline Penuh</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {/* Horizontal Visual Step Track for Desktop / Tablet */}
        <div className="relative">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {milestones.map((milestone, index) => {
              const isDone = milestone.status === "done";
              const isInProgress = milestone.status === "in_progress";
              const isBlocked = milestone.status === "blocked";
              const badge = getDaysRemainingBadge(milestone.dueDate, milestone.status);

              return (
                <div
                  key={milestone.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-xl border p-3.5 transition-all",
                    isDone && "border-emerald-500/20 bg-emerald-500/5",
                    isInProgress && "border-primary/40 bg-primary/5 shadow-2xs ring-1 ring-primary/20",
                    isBlocked && "border-rose-500/20 bg-rose-500/5",
                    !isDone && !isInProgress && !isBlocked && "border-border/60 bg-muted/20",
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Fase {index + 1}
                      </span>
                      <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium", badge.className)}>
                        {badge.text}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isInProgress ? (
                          <PlayCircle className="size-4 text-primary animate-pulse" />
                        ) : isBlocked ? (
                          <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs font-semibold text-foreground leading-snug">
                        {milestone.title}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                    <span>Bobot {milestone.weight}</span>
                    <span className="font-medium text-foreground">
                      {milestone.dueDate ? formatDate(milestone.dueDate) : "Fleksibel"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Full Expanded Roadmap View
  return (
    <div className="space-y-6">
      {/* Timeline Stepper Container */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
              Jadwal & Fase Eksekusi
            </h3>
            <p className="text-xs text-muted-foreground">
              Urutan milestone dari kick-off hingga penyelesaian akhir project
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-foreground">
                {completedCount} dari {milestones.length} Milestone
              </p>
              <p className="text-[11px] text-muted-foreground">
                {project.progressPercent}% Target Terpenuhi
              </p>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs">
              <Link href={`/projects/${project.id}/milestones`}>
                <ListChecks className="size-3.5" />
                <span>Atur Milestone</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Vertical Connected Timeline Track */}
        <div className="relative mt-8">
          {/* Start Node: Kickoff */}
          <div className="flex items-stretch gap-3 sm:gap-5">
            <div className="flex w-8 sm:w-9 shrink-0 flex-col items-center">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background ring-4 ring-card">
                <Flag className="size-3.5 text-primary" />
              </div>
              <div className="w-0.5 flex-1 bg-border/80 my-1.5" />
            </div>
            <div className="min-w-0 flex-1 pb-7 pt-0.5 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  Kickoff & Mulai Project
                </span>
                <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Titik Awal
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tanggal Mulai:{" "}
                <span className="font-medium text-foreground">
                  {project.startDate ? formatDate(project.startDate) : formatDate(project.createdAt)}
                </span>
              </p>
            </div>
          </div>

          {/* Milestone Nodes */}
          {milestones.map((milestone, index) => {
            const isDone = milestone.status === "done";
            const isInProgress = milestone.status === "in_progress";
            const isBlocked = milestone.status === "blocked";
            const badge = getDaysRemainingBadge(milestone.dueDate, milestone.status);

            return (
              <div key={milestone.id} className="flex items-stretch gap-3 sm:gap-5">
                {/* Node Marker & Connector Column */}
                <div className="flex w-8 sm:w-9 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ring-4 ring-card transition-colors",
                      isDone && "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
                      isInProgress && "border-primary bg-primary/10 text-primary shadow-xs ring-primary/20",
                      isBlocked && "border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
                      !isDone && !isInProgress && !isBlocked && "border-border/80 text-muted-foreground/60",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4" />
                    ) : isInProgress ? (
                      <PlayCircle className="size-4 animate-pulse" />
                    ) : isBlocked ? (
                      <AlertTriangle className="size-4" />
                    ) : (
                      <span className="font-mono text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="w-0.5 flex-1 bg-border/80 my-1.5" />
                </div>

                {/* Milestone Detail Card */}
                <div className="min-w-0 flex-1 pb-7">
                  <div
                    className={cn(
                      "rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all",
                      isDone && "border-emerald-500/20 bg-emerald-500/5",
                      isInProgress && "border-primary/40 bg-primary/5 shadow-xs ring-1 ring-primary/20",
                      isBlocked && "border-rose-500/20 bg-rose-500/5",
                      !isDone && !isInProgress && !isBlocked && "border-border/70 bg-card",
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Fase {index + 1}
                          </span>
                          <MilestoneStatusBadge status={milestone.status} />
                          <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Bobot {milestone.weight}
                          </span>
                        </div>

                        <h4 className="font-heading text-base font-bold text-foreground">
                          {milestone.title}
                        </h4>

                        {milestone.description ? (
                          <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                            {milestone.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 pt-1 sm:pt-0">
                        <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", badge.className)}>
                          {badge.text}
                        </span>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          <span>
                            {milestone.dueDate ? formatDate(milestone.dueDate) : "Jadwal Fleksibel"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {milestone.completedAt ? (
                      <div className="mt-3.5 flex items-center gap-1.5 border-t border-border/50 pt-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="size-3.5" />
                        <span>Selesai pada {formatDate(milestone.completedAt)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {/* End Node: Final Delivery / Deadline */}
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="flex w-8 sm:w-9 shrink-0 flex-col items-center">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ring-4 ring-card",
                  overdueProject
                    ? "border-rose-500 text-rose-600"
                    : "border-primary text-primary",
                )}
              >
                <Sparkles className="size-3.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  Target Peluncuran / Penyelesaian Akhir
                </span>
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                    overdueProject
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-border/60 bg-muted/40 text-muted-foreground",
                  )}
                >
                  {overdueProject ? "Lewat Deadline" : "Tenggat Waktu"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deadline Kontrak:{" "}
                <span className="font-medium text-foreground">
                  {project.dueDate ? formatDate(project.dueDate) : "Fleksibel tanpa deadline ketat"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
