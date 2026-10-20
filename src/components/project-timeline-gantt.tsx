"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isBefore,
  isToday,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  Flag,
  Milestone as MilestoneIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Milestone, Payment, Project, Update } from "@/lib/db/schema";
import { formatDate, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { MILESTONE_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GanttZoom = "days" | "weeks" | "months";

interface GanttMilestonePhase {
  milestone: Milestone;
  index: number;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  startOffsetDays: number;
}

export function ProjectTimelineGantt({
  project,
  milestones,
  updates,
  payments,
  currency,
}: {
  project: Project;
  milestones: Milestone[];
  updates: Update[];
  payments: (Payment & { term?: { label: string } | null })[];
  currency: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<GanttZoom>("weeks");
  const [showPayments, setShowPayments] = useState(true);
  const [showUpdates, setShowUpdates] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // 1. Calculate overall timeline boundaries
  const { timelineStart, timelineEnd, totalTimelineDays, projectStartDate, projectDueDate } =
    useMemo(() => {
      const pStart = project.startDate
        ? parseISO(project.startDate)
        : new Date(project.createdAt);
      const pDue = project.dueDate
        ? parseISO(project.dueDate)
        : addDays(pStart, 30);

      let earliest = pStart;
      let latest = pDue;

      for (const m of milestones) {
        if (m.dueDate) {
          const d = parseISO(m.dueDate);
          if (isBefore(d, earliest)) earliest = d;
          if (isBefore(latest, d)) latest = d;
        }
      }

      // Add small buffer days before and after
      const tStart = startOfWeek(subDays(earliest, 3), { weekStartsOn: 1 });
      const tEnd = endOfWeek(addDays(latest, 5), { weekStartsOn: 1 });
      const totalDays = Math.max(1, differenceInCalendarDays(tEnd, tStart) + 1);

      return {
        timelineStart: tStart,
        timelineEnd: tEnd,
        totalTimelineDays: totalDays,
        projectStartDate: pStart,
        projectDueDate: pDue,
      };
    }, [project, milestones]);

  // 2. Compute phases for each milestone
  const phases: GanttMilestonePhase[] = useMemo(() => {
    return milestones.map((milestone, idx) => {
      let phaseEnd: Date;
      if (milestone.dueDate) {
        phaseEnd = parseISO(milestone.dueDate);
      } else {
        phaseEnd = addDays(projectStartDate, Math.round(((idx + 1) / Math.max(1, milestones.length)) * 30));
      }

      let phaseStart: Date;
      if (idx === 0) {
        phaseStart = projectStartDate;
      } else {
        const prevMilestone = milestones[idx - 1];
        if (prevMilestone?.dueDate) {
          const prevDue = parseISO(prevMilestone.dueDate);
          phaseStart = isBefore(prevDue, phaseEnd) ? prevDue : subDays(phaseEnd, 5);
        } else {
          phaseStart = subDays(phaseEnd, 7);
        }
      }

      // Ensure start is strictly before end
      if (!isBefore(phaseStart, phaseEnd)) {
        phaseStart = subDays(phaseEnd, 3);
      }

      const duration = Math.max(1, differenceInCalendarDays(phaseEnd, phaseStart) + 1);
      const offset = Math.max(0, differenceInCalendarDays(phaseStart, timelineStart));

      return {
        milestone,
        index: idx,
        startDate: phaseStart,
        endDate: phaseEnd,
        durationDays: duration,
        startOffsetDays: offset,
      };
    });
  }, [milestones, projectStartDate, timelineStart]);

  // Column width configuration based on zoom
  const dayColumnWidth = zoom === "days" ? 42 : zoom === "weeks" ? 18 : 6;
  const totalChartWidth = totalTimelineDays * dayColumnWidth;

  // Day intervals
  const allDays = useMemo(() => {
    return eachDayOfInterval({ start: timelineStart, end: timelineEnd });
  }, [timelineStart, timelineEnd]);

  // Week intervals for header
  const weekIntervals = useMemo(() => {
    return eachWeekOfInterval(
      { start: timelineStart, end: timelineEnd },
      { weekStartsOn: 1 },
    );
  }, [timelineStart, timelineEnd]);

  // Month intervals for header
  const monthIntervals = useMemo(() => {
    return eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
  }, [timelineStart, timelineEnd]);

  // Today position in px
  const today = todayISO();
  const todayDate = parseISO(today);
  const todayOffsetDays = differenceInCalendarDays(todayDate, timelineStart);
  const isTodayInTimeline = todayOffsetDays >= 0 && todayOffsetDays <= totalTimelineDays;
  const todayLeftPx = todayOffsetDays * dayColumnWidth + dayColumnWidth / 2;

  // Project overall bar position
  const projectOffsetDays = Math.max(0, differenceInCalendarDays(projectStartDate, timelineStart));
  const projectDurationDays = Math.max(1, differenceInCalendarDays(projectDueDate, projectStartDate) + 1);
  const projectLeftPx = projectOffsetDays * dayColumnWidth;
  const projectWidthPx = projectDurationDays * dayColumnWidth;

  // Function to scroll directly to Today marker
  const scrollToToday = () => {
    if (scrollContainerRef.current && isTodayInTimeline) {
      const container = scrollContainerRef.current;
      const targetScroll = Math.max(0, todayLeftPx - container.clientWidth / 2 + 100);
      container.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -250, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 250, behavior: "smooth" });
    }
  };

  if (milestones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center space-y-4">
        <MilestoneIcon className="mx-auto size-9 text-muted-foreground/70" />
        <div className="space-y-1">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Gantt Chart Belum Tersedia
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tambahkan milestone pertama untuk membentuk jadwal tahapan kerja dan visualisasi Gantt chart interaktif.
          </p>
        </div>
        <Button asChild size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-xs">
          <Link href={`/projects/${project.id}/milestones`}>
            <Plus className="size-3.5" />
            <span>Tambah Milestone Sekarang</span>
          </Link>
        </Button>
      </div>
    );
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "done":
        return {
          bar: "bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-200 shadow-2xs hover:bg-emerald-500/30",
          progress: "bg-emerald-500",
          dot: "bg-emerald-500",
          badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          icon: CheckCircle2,
        };
      case "in_progress":
        return {
          bar: "bg-amber-500/25 border-amber-500/60 text-amber-900 dark:text-amber-200 shadow-2xs hover:bg-amber-500/35",
          progress: "bg-amber-500",
          dot: "bg-amber-500",
          badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          icon: Clock,
        };
      case "blocked":
        return {
          bar: "bg-rose-500/20 border-rose-500/50 text-rose-800 dark:text-rose-200 shadow-2xs hover:bg-rose-500/30",
          progress: "bg-rose-500",
          dot: "bg-rose-500",
          badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          icon: AlertCircle,
        };
      default:
        return {
          bar: "bg-muted/70 border-border/80 text-muted-foreground hover:bg-muted/90",
          progress: "bg-muted-foreground/40",
          dot: "bg-muted-foreground",
          badge: "border-border/60 bg-muted/40 text-muted-foreground",
          icon: MilestoneIcon,
        };
    }
  }

  return (
    <div className="space-y-4">
      {/* Gantt Control Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        {/* Left: Title & Quick Info */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Gantt Chart Jadwal & Tahapan
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Visualisasi rentang durasi pengerjaan, milestone aktif, dan target penyelesaian kontrak.
          </p>
        </div>

        {/* Right: Controls & Zoom Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Buttons */}
          <div className="flex items-center p-0.5 rounded-xl bg-muted/50 border border-border/60">
            <button
              type="button"
              onClick={() => setZoom("days")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                zoom === "days"
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setZoom("weeks")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                zoom === "weeks"
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setZoom("months")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                zoom === "months"
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Bulanan
            </button>
          </div>

          {/* Jump to Today */}
          {isTodayInTimeline ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToToday}
              className="h-8 rounded-xl px-2.5 text-xs font-medium shadow-2xs gap-1.5"
            >
              <Calendar className="size-3 text-primary" />
              <span>Ke Hari Ini</span>
            </Button>
          ) : null}

          {/* Scroll Nav buttons */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={scrollLeft}
              className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Geser ke kiri"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={scrollRight}
              className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Geser ke kanan"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Keterangan:
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <span className="size-2 rounded-sm bg-emerald-500" />
          Selesai
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <span className="size-2 rounded-sm bg-amber-500" />
          Sedang Dikerjakan
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <span className="size-2 rounded-sm bg-muted-foreground" />
          Belum Mulai
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
          <span className="size-2 rounded-sm bg-rose-500" />
          Terhambat
        </span>
        {isTodayInTimeline ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <span className="size-2 rounded-full bg-primary" />
            Garis Hari Ini
          </span>
        ) : null}
      </div>

      {/* Gantt Chart Main Container */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div
          ref={scrollContainerRef}
          className="relative overflow-x-auto scrollbar-thin select-none"
        >
          <div
            className="flex min-w-full"
            style={{ width: `${Math.max(860, 260 + totalChartWidth)}px` }}
          >
            {/* Sticky Left Column: Task & Phase Hierarchy */}
            <div className="sticky left-0 z-30 w-64 sm:w-80 shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-md">
              {/* Header row 1: Blank / Month sync */}
              <div className="h-10 border-b border-border/60 px-4 flex items-center font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                Tahapan Proyek
              </div>
              {/* Header row 2: Column Titles */}
              <div className="h-8 border-b border-border/60 px-4 flex items-center justify-between text-[11px] font-semibold text-muted-foreground bg-muted/20">
                <span>Milestone</span>
                <span>Bobot / Tenggat</span>
              </div>

              {/* Row 0: Overall Project */}
              <div className="h-14 border-b border-border/60 px-4 flex items-center justify-between bg-primary/5">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Flag className="size-3.5 text-primary shrink-0" />
                    <span className="font-heading text-xs font-bold text-foreground truncate">
                      {project.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {project.code}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-primary shrink-0">
                  {project.progressPercent}%
                </span>
              </div>

              {/* Rows: Milestones */}
              {phases.map(({ milestone, index, durationDays }) => {
                const style = getStatusStyle(milestone.status);
                const Icon = style.icon;
                return (
                  <div
                    key={milestone.id}
                    className="h-14 border-b border-border/60 px-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("size-3.5 shrink-0", style.dot.replace("bg-", "text-"))} />
                        <span className="font-heading text-xs font-semibold text-foreground truncate">
                          Fase {index + 1}: {milestone.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-5.5 truncate">
                        Durasi ~{durationDays} hari
                      </p>
                    </div>

                    <div className="shrink-0 text-right space-y-0.5">
                      <span className="inline-block rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground">
                        {milestone.weight}%
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {milestone.dueDate ? formatDate(milestone.dueDate) : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Extra Summary Rows: Deliverables & Payments */}
              {showUpdates && updates.length > 0 ? (
                <div className="h-10 border-b border-border/60 px-4 flex items-center gap-2 bg-muted/20 text-xs text-muted-foreground font-medium">
                  <FileText className="size-3.5 text-sky-600" />
                  <span>Update Deliverables ({updates.length})</span>
                </div>
              ) : null}

              {showPayments && payments.length > 0 ? (
                <div className="h-10 border-b border-border/60 px-4 flex items-center gap-2 bg-muted/20 text-xs text-muted-foreground font-medium">
                  <Coins className="size-3.5 text-violet-600" />
                  <span>Pembayaran ({payments.length})</span>
                </div>
              ) : null}
            </div>

            {/* Right: Gantt Timeline Grid Track */}
            <div className="relative flex-1" style={{ width: `${totalChartWidth}px` }}>
              {/* Header Row 1: Months */}
              <div className="h-10 border-b border-border/60 flex bg-muted/40">
                {monthIntervals.map((mStart, mIdx) => {
                  const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0);
                  const clampedStart = isBefore(mStart, timelineStart) ? timelineStart : mStart;
                  const clampedEnd = isBefore(timelineEnd, mEnd) ? timelineEnd : mEnd;
                  const daysInM = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart) + 1);
                  const widthPx = daysInM * dayColumnWidth;

                  return (
                    <div
                      key={mIdx}
                      style={{ width: `${widthPx}px` }}
                      className="border-r border-border/60 px-3 flex items-center font-heading text-xs font-bold text-foreground capitalize truncate"
                    >
                      {format(mStart, "MMMM yyyy", { locale: localeId })}
                    </div>
                  );
                })}
              </div>

              {/* Header Row 2: Days or Weeks */}
              <div className="h-8 border-b border-border/60 flex bg-muted/20 text-[10px] text-muted-foreground font-semibold">
                {zoom === "days"
                  ? allDays.map((d, dIdx) => {
                      const isDToday = isToday(d);
                      const isSunday = d.getDay() === 0;
                      return (
                        <div
                          key={dIdx}
                          style={{ width: `${dayColumnWidth}px` }}
                          className={cn(
                            "border-r border-border/40 flex flex-col items-center justify-center shrink-0",
                            isDToday && "bg-primary/10 text-primary font-bold",
                            isSunday && "bg-muted/40",
                          )}
                          title={format(d, "EEEE, d MMM yyyy", { locale: localeId })}
                        >
                          <span className="leading-none">{format(d, "d")}</span>
                        </div>
                      );
                    })
                  : weekIntervals.map((wStart, wIdx) => {
                      const wEnd = addDays(wStart, 6);
                      const widthPx = 7 * dayColumnWidth;
                      return (
                        <div
                          key={wIdx}
                          style={{ width: `${widthPx}px` }}
                          className="border-r border-border/40 px-1 flex items-center justify-center shrink-0 text-center truncate"
                        >
                          {format(wStart, "d MMM", { locale: localeId })} - {format(wEnd, "d MMM", { locale: localeId })}
                        </div>
                      );
                    })}
              </div>

              {/* Background Grid Vertical Lines */}
              <div className="absolute inset-0 top-18 pointer-events-none flex">
                {zoom === "days"
                  ? allDays.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        style={{ width: `${dayColumnWidth}px` }}
                        className={cn(
                          "border-r border-border/30 h-full shrink-0",
                          d.getDay() === 0 && "bg-muted/20",
                        )}
                      />
                    ))
                  : weekIntervals.map((_, wIdx) => (
                      <div
                        key={wIdx}
                        style={{ width: `${7 * dayColumnWidth}px` }}
                        className="border-r border-border/40 h-full shrink-0"
                      />
                    ))}
              </div>

              {/* Today Vertical Line Indicator */}
              {isTodayInTimeline ? (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none border-l-2 border-dashed border-primary"
                  style={{ left: `${todayLeftPx}px` }}
                >
                  <div className="sticky top-0 -ml-7 mt-1.5 flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-sm">
                    Hari Ini
                  </div>
                </div>
              ) : null}

              {/* Target Peluncuran Vertical Indicator */}
              {project.dueDate ? (
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none border-l-2 border-emerald-500/60"
                  style={{ left: `${(differenceInCalendarDays(projectDueDate, timelineStart) + 1) * dayColumnWidth}px` }}
                >
                  <div className="sticky top-0 -ml-9 mt-1.5 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    <Flag className="size-2.5" />
                    Deadline
                  </div>
                </div>
              ) : null}

              {/* Row 0: Overall Project Track Bar */}
              <div className="h-14 border-b border-border/60 relative flex items-center">
                <div
                  className="absolute h-6 rounded-lg bg-primary/15 border border-primary/30 flex items-center px-2.5 overflow-hidden transition-all duration-300"
                  style={{
                    left: `${projectLeftPx}px`,
                    width: `${projectWidthPx}px`,
                  }}
                  title={`Kontrak: ${formatMoney(project.totalAmount, project.currency)}`}
                >
                  {/* Progress Fill inside bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/25 rounded-l-lg"
                    style={{ width: `${project.progressPercent}%` }}
                  />
                  <div className="relative z-10 flex items-center justify-between w-full text-xs font-semibold text-foreground truncate">
                    <span className="truncate">{project.name}</span>
                    <span className="shrink-0 text-[10px] font-mono text-primary font-bold pl-2">
                      {project.progressPercent}% Selesai
                    </span>
                  </div>
                </div>
              </div>

              {/* Rows: Milestone Gantt Bars */}
              {phases.map((phase) => {
                const style = getStatusStyle(phase.milestone.status);
                const Icon = style.icon;
                const barLeftPx = phase.startOffsetDays * dayColumnWidth;
                const barWidthPx = Math.max(dayColumnWidth * 2, phase.durationDays * dayColumnWidth);
                const isDone = phase.milestone.status === "done";
                const isCurrent = phase.milestone.status === "in_progress";

                return (
                  <div
                    key={phase.milestone.id}
                    className="h-14 border-b border-border/60 relative flex items-center group"
                  >
                    {/* The Gantt Bar */}
                    <div
                      className={cn(
                        "absolute h-7 rounded-xl border flex items-center px-2.5 transition-all duration-200 cursor-pointer",
                        style.bar,
                      )}
                      style={{
                        left: `${barLeftPx}px`,
                        width: `${barWidthPx}px`,
                      }}
                      onClick={() =>
                        setActiveTooltip(
                          activeTooltip === phase.milestone.id ? null : phase.milestone.id,
                        )
                      }
                      title={`Fase ${phase.index + 1}: ${phase.milestone.title} (${formatDate(phase.startDate)} - ${formatDate(phase.endDate)})`}
                    >
                      {/* Completion Progress Overlay */}
                      {isDone ? (
                        <div className="absolute inset-0 rounded-xl bg-emerald-500/20" />
                      ) : isCurrent ? (
                        <div
                          className="absolute inset-y-0 left-0 rounded-l-xl bg-amber-500/25 animate-pulse"
                          style={{ width: "50%" }}
                        />
                      ) : null}

                      <div className="relative z-10 flex items-center gap-1.5 w-full overflow-hidden text-xs font-semibold">
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{phase.milestone.title}</span>
                      </div>
                    </div>

                    {/* Popover / Tooltip on Click */}
                    {activeTooltip === phase.milestone.id ? (
                      <div
                        className="absolute z-40 top-12 rounded-xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-lg text-xs space-y-1.5 w-64"
                        style={{ left: `${barLeftPx}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold", style.badge)}>
                            {MILESTONE_STATUS_LABELS[phase.milestone.status] ?? phase.milestone.status}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-muted-foreground">
                            Bobot {phase.milestone.weight}%
                          </span>
                        </div>
                        <h4 className="font-heading font-bold text-foreground text-sm">
                          {phase.milestone.title}
                        </h4>
                        {phase.milestone.description ? (
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {phase.milestone.description}
                          </p>
                        ) : null}
                        <div className="border-t border-border/60 pt-1 text-[10px] text-muted-foreground flex justify-between">
                          <span>Mulai: {formatDate(phase.startDate)}</span>
                          <span>Target: {formatDate(phase.endDate)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Deliverables / Updates Row */}
              {showUpdates && updates.length > 0 ? (
                <div className="h-10 border-b border-border/60 relative flex items-center bg-muted/10">
                  {updates.map((u) => {
                    const uDate = new Date(u.createdAt);
                    const offset = differenceInCalendarDays(uDate, timelineStart);
                    const leftPx = offset * dayColumnWidth + dayColumnWidth / 2;
                    return (
                      <div
                        key={u.id}
                        className="absolute -ml-3 flex items-center justify-center size-6 rounded-full bg-sky-500/20 border border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                        style={{ left: `${leftPx}px` }}
                        title={`Update (${formatDate(uDate)}): ${u.title}`}
                      >
                        <FileText className="size-3" />
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Payments Row */}
              {showPayments && payments.length > 0 ? (
                <div className="h-10 border-b border-border/60 relative flex items-center bg-muted/10">
                  {payments.map((p) => {
                    const pDate = p.paidAt ? parseISO(p.paidAt) : new Date(p.createdAt);
                    const offset = differenceInCalendarDays(pDate, timelineStart);
                    const leftPx = offset * dayColumnWidth + dayColumnWidth / 2;
                    const isVerified = p.status === "verified";
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "absolute -ml-3 flex items-center justify-center size-6 rounded-full border shadow-2xs hover:scale-110 transition-transform cursor-pointer",
                          isVerified
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300",
                        )}
                        style={{ left: `${leftPx}px` }}
                        title={`Pembayaran (${formatDate(pDate)}): ${formatMoney(p.amount, currency)} (${isVerified ? "Lunas" : "Pending"})`}
                      >
                        <Coins className="size-3" />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              Total Rentang: ~{totalTimelineDays} hari ({formatDate(timelineStart)} - {formatDate(timelineEnd)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showUpdates}
                onChange={(e) => setShowUpdates(e.target.checked)}
                className="rounded border-border size-3.5 text-primary"
              />
              <span>Tampilkan Deliverables</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPayments}
                onChange={(e) => setShowPayments(e.target.checked)}
                className="rounded border-border size-3.5 text-primary"
              />
              <span>Tampilkan Pembayaran</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
