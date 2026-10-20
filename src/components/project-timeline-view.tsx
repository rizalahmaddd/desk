"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  GanttChart,
  History,
  Plus,
  Sparkles,
} from "lucide-react";
import type { Activity, Milestone, Payment, Project, Update } from "@/lib/db/schema";
import { formatDate, isOverdue, daysUntil } from "@/lib/dates";
import { ProjectTimelineRoadmap } from "@/components/project-timeline-roadmap";
import { ProjectTimelineFeed } from "@/components/project-timeline-feed";
import { ProjectTimelineCalendar } from "@/components/project-timeline-calendar";
import { ProjectTimelineGantt } from "@/components/project-timeline-gantt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectTimelineView({
  project,
  milestones,
  updates,
  payments,
  activity,
}: {
  project: Project;
  milestones: Milestone[];
  updates: Update[];
  payments: (Payment & { term?: { label: string } | null })[];
  activity: Activity[];
}) {
  const [activeTab, setActiveTab] = useState<"gantt" | "roadmap" | "calendar" | "feed">("gantt");

  const completedCount = milestones.filter((m) => m.status === "done").length;
  const overdueProject = isOverdue(project.dueDate) && project.status === "active";
  const daysLeft = daysUntil(project.dueDate);

  // Calculate schedule health status
  const scheduleHealth =
    project.status === "completed"
      ? {
          label: "Proyek Selesai",
          color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          icon: CheckCircle2,
        }
      : overdueProject
        ? {
            label: "Lewat Tenggat Waktu",
            color: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
            icon: Clock,
          }
        : {
            label: "Berjalan Sesuai Jadwal",
            color: "border-primary/20 bg-primary/10 text-primary",
            icon: Sparkles,
          };

  const HealthIcon = scheduleHealth.icon;

  return (
    <div className="space-y-6">
      {/* Header Metric Highlights */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status Jadwal */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status Jadwal
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", scheduleHealth.color)}>
              <HealthIcon className="size-3.5" />
              <span>{scheduleHealth.label}</span>
            </span>
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {project.dueDate
              ? overdueProject
                ? `Terlambat ${Math.abs(daysLeft ?? 0)} Hari`
                : daysLeft === 0
                  ? "Deadline Hari Ini"
                  : `Tersisa ${daysLeft} Hari`
              : "Jadwal Fleksibel"}
          </div>
          <p className="text-xs text-muted-foreground">
            Target selesai: {project.dueDate ? formatDate(project.dueDate) : "Belum ditentukan"}
          </p>
        </div>

        {/* Kemajuan Milestone */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Milestone Selesai
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {project.progressPercent}%
            </span>
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums">
            {completedCount} <span className="text-sm font-normal text-muted-foreground">/ {milestones.length} Fase</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {milestones.length - completedCount} tahapan tersisa untuk diselesaikan
          </p>
        </div>

        {/* Tanggal Kickoff */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mulai Pengerjaan
            </span>
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {project.startDate ? formatDate(project.startDate) : formatDate(project.createdAt)}
          </div>
          <p className="text-xs text-muted-foreground">
            Tanggal resmi dimulainya kontrak
          </p>
        </div>

        {/* Total Aktivitas & Riwayat */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Riwayat Terkumpul
            </span>
            <History className="size-4 text-muted-foreground" />
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums">
            {updates.length + activity.length + payments.length}{" "}
            <span className="text-sm font-normal text-muted-foreground">Peristiwa</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Update, pembayaran, dan log milestone
          </p>
        </div>
      </div>

      {/* View Switcher Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("gantt")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all select-none",
              activeTab === "gantt"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <GanttChart className="size-4 text-primary" />
            <span>Gantt Chart</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roadmap")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all select-none",
              activeTab === "roadmap"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Compass className="size-4 text-primary" />
            <span>Roadmap & Fase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all select-none",
              activeTab === "calendar"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-4 text-primary" />
            <span>Mode Kalender</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all select-none",
              activeTab === "feed"
                ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="size-4 text-primary" />
            <span>Kronologi Lengkap</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs">
            <Link href={`/projects/${project.id}/milestones`}>
              <Plus className="size-3.5" />
              <span>Tambah Milestone</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Timeline View */}
      {activeTab === "gantt" ? (
        <ProjectTimelineGantt
          project={project}
          milestones={milestones}
          updates={updates}
          payments={payments}
          currency={project.currency}
        />
      ) : activeTab === "roadmap" ? (
        <ProjectTimelineRoadmap project={project} milestones={milestones} />
      ) : activeTab === "calendar" ? (
        <ProjectTimelineCalendar
          project={project}
          milestones={milestones}
          updates={updates}
          payments={payments}
          currency={project.currency}
        />
      ) : (
        <ProjectTimelineFeed
          milestones={milestones}
          updates={updates}
          payments={payments}
          activity={activity}
          currency={project.currency}
        />
      )}
    </div>
  );
}
