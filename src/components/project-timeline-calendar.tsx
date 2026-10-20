"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  Flag,
  ListChecks,
  Milestone as MilestoneIcon,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { Milestone, Payment, Project, Update } from "@/lib/db/schema";
import { formatDate, toISODay, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { MILESTONE_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TimelineCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: "kickoff" | "deadline" | "milestone" | "update" | "payment";
  title: string;
  subtitle?: string;
  status?: string;
  amount?: number;
  weight?: number;
  categoryLabel: string;
}

export function ProjectTimelineCalendar({
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
  // Aggregate all events
  const allEvents = useMemo(() => {
    const list: TimelineCalendarEvent[] = [];

    // 1. Kickoff
    const kickoffDate =
      project.startDate ||
      toISODay(new Date(project.createdAt));
    if (kickoffDate) {
      list.push({
        id: `kickoff-${project.id}`,
        date: kickoffDate,
        type: "kickoff",
        title: "Kickoff / Mulai Pengerjaan",
        subtitle: `Proyek ${project.name} resmi dimulai.`,
        categoryLabel: "Kickoff",
      });
    }

    // 2. Project Deadline
    if (project.dueDate) {
      list.push({
        id: `deadline-${project.id}`,
        date: project.dueDate,
        type: "deadline",
        title: "Target Akhir Kontrak",
        subtitle: `Batas akhir penyerahan seluruh deliverable proyek (${project.code}).`,
        categoryLabel: "Target Akhir",
      });
    }

    // 3. Milestones
    for (const m of milestones) {
      if (m.dueDate) {
        list.push({
          id: `milestone-${m.id}`,
          date: m.dueDate,
          type: "milestone",
          title: m.title,
          subtitle: m.description || `Tahapan pengerjaan (Bobot ${m.weight}%)`,
          status: m.status,
          weight: m.weight,
          categoryLabel: `Milestone (${MILESTONE_STATUS_LABELS[m.status] ?? m.status})`,
        });
      }
    }

    // 4. Updates
    for (const u of updates) {
      const updateDate = toISODay(new Date(u.createdAt));
      list.push({
        id: `update-${u.id}`,
        date: updateDate,
        type: "update",
        title: u.title || "Update & Deliverables",
        subtitle: u.body ? (u.body.length > 80 ? `${u.body.slice(0, 80)}...` : u.body) : undefined,
        categoryLabel: "Update Pengerjaan",
      });
    }

    // 5. Payments
    for (const p of payments) {
      const payDate =
        p.paidAt || toISODay(new Date(p.createdAt));
      list.push({
        id: `payment-${p.id}`,
        date: payDate,
        type: "payment",
        title: `Pembayaran ${formatMoney(p.amount, currency)}`,
        subtitle: `${p.status === "verified" ? "Terverifikasi" : "Menunggu Verifikasi"}${
          p.term?.label ? ` · ${p.term.label}` : ""
        }`,
        status: p.status,
        amount: p.amount,
        categoryLabel: p.status === "verified" ? "Pembayaran Lunas" : "Klaim Pembayaran",
      });
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [project, milestones, updates, payments, currency]);

  // Determine initial month: prefer first upcoming milestone/deadline, or current date
  const initialDate = useMemo(() => {
    const today = todayISO();
    const upcoming = allEvents.find((e) => e.date >= today);
    if (upcoming) return parseISO(upcoming.date);
    if (allEvents.length > 0) return parseISO(allEvents[0].date);
    return new Date();
  }, [allEvents]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Month navigation helpers
  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(todayISO());
  };

  // Calendar dates generation (Monday start)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInCalendar = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineCalendarEvent[]>();
    for (const ev of allEvents) {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return map;
  }, [allEvents]);

  // Events in current visible month
  const currentMonthEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const d = parseISO(ev.date);
      return isSameMonth(d, currentMonth);
    });
  }, [allEvents, currentMonth]);

  // Selected date events
  const selectedDayEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : null;

  function getEventStyle(event: TimelineCalendarEvent) {
    switch (event.type) {
      case "kickoff":
        return {
          pill: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/15",
          dot: "bg-blue-500",
          icon: PlayCircle,
        };
      case "deadline":
        return {
          pill: "bg-primary/10 text-primary border-primary/20 font-semibold hover:bg-primary/15",
          dot: "bg-primary",
          icon: Flag,
        };
      case "milestone":
        if (event.status === "done") {
          return {
            pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15",
            dot: "bg-emerald-500",
            icon: CheckCircle2,
          };
        }
        if (event.status === "in_progress") {
          return {
            pill: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15",
            dot: "bg-amber-500",
            icon: Clock,
          };
        }
        if (event.status === "blocked") {
          return {
            pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/15",
            dot: "bg-rose-500",
            icon: AlertCircle,
          };
        }
        return {
          pill: "bg-muted/80 text-muted-foreground border-border/60 hover:bg-muted",
          dot: "bg-muted-foreground",
          icon: MilestoneIcon,
        };
      case "update":
        return {
          pill: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 hover:bg-sky-500/15",
          dot: "bg-sky-500",
          icon: FileText,
        };
      case "payment":
        return {
          pill: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 hover:bg-violet-500/15",
          dot: "bg-violet-500",
          icon: Coins,
        };
      default:
        return {
          pill: "bg-muted/60 text-foreground border-border/60",
          dot: "bg-primary",
          icon: Sparkles,
        };
    }
  }

  const weekDayHeaders = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs space-y-5">
        {/* Navigation & Month Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="size-4.5" />
            </span>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: localeId })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {currentMonthEvents.length} peristiwa & jadwal tercatat pada bulan ini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-9 rounded-xl px-3 text-xs font-medium shadow-2xs"
            >
              Bulan Ini
            </Button>
            <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={prevMonth}
                className="size-8 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={nextMonth}
                className="size-8 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 mr-1">
            Keterangan:
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Milestone Selesai
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Milestone Berjalan
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Target Kontrak
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
            <span className="size-1.5 rounded-full bg-sky-500" />
            Update Deliverable
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
            <span className="size-1.5 rounded-full bg-violet-500" />
            Pembayaran
          </span>
        </div>

        {/* 7-Day Calendar Grid */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-border/40 shadow-2xs">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-muted/70 text-center text-xs font-semibold text-muted-foreground py-2 border-b border-border/60">
            {weekDayHeaders.map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-px bg-border/60">
            {daysInCalendar.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isCurrent = isSameMonth(day, currentMonth);
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isSelected = selectedDate === dateStr;
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    "group relative min-h-[72px] sm:min-h-[96px] p-1.5 sm:p-2 text-left transition-colors flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isCurrent ? "bg-card" : "bg-muted/30 text-muted-foreground/40",
                    isSelected && "ring-2 ring-primary ring-inset z-10 bg-primary/5",
                    !isSelected && isCurrent && "hover:bg-accent/40",
                  )}
                >
                  {/* Day Number and Today Indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 sm:size-7 items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition-colors",
                        isCurrentDay
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : isSelected
                            ? "bg-primary/20 text-primary font-bold"
                            : isCurrent
                              ? "text-foreground group-hover:text-primary"
                              : "text-muted-foreground/40",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Mobile dots or event count badge */}
                    {dayEvents.length > 0 ? (
                      <span className="sm:hidden flex size-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>

                  {/* Desktop / Tablet Event Pills */}
                  <div className="mt-1 hidden sm:flex flex-col gap-1 w-full overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const style = getEventStyle(ev);
                      const Icon = style.icon;
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium truncate transition-colors",
                            style.pill,
                          )}
                          title={`${ev.categoryLabel}: ${ev.title}`}
                        >
                          <Icon className="size-2.5 shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 ? (
                      <span className="text-[10px] text-muted-foreground font-medium pl-1">
                        +{dayEvents.length - 2} lainnya
                      </span>
                    ) : null}
                  </div>

                  {/* Mobile Color Dots */}
                  <div className="mt-1 flex sm:hidden items-center gap-1 overflow-hidden pt-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const style = getEventStyle(ev);
                      return (
                        <span
                          key={ev.id}
                          className={cn("size-1.5 rounded-full shrink-0", style.dot)}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day or Month Agenda Section */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="size-4" />
            </span>
            <h4 className="font-heading text-base font-semibold text-foreground">
              {selectedDate
                ? `Rincian Agenda: ${formatDate(selectedDate)}`
                : `Agenda Proyek Bulan ${format(currentMonth, "MMMM yyyy", { locale: localeId })}`}
            </h4>
          </div>

          {selectedDate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(null)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
            >
              Tampilkan Semua Bulan Ini
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Klik tanggal pada kalender untuk melihat detail hari tertentu
            </span>
          )}
        </div>

        {/* Event List */}
        {selectedDate ? (
          // Events for selected date
          selectedDayEvents && selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map((ev) => {
                const style = getEventStyle(ev);
                const Icon = style.icon;
                return (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-xl border border-border/80 bg-card/60 p-4 transition-colors hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", style.pill)}>
                        <Icon className="size-4.5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold", style.pill)}>
                            {ev.categoryLabel}
                          </span>
                          {ev.weight ? (
                            <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                              Bobot {ev.weight}%
                            </span>
                          ) : null}
                        </div>
                        <h5 className="font-heading text-sm sm:text-base font-semibold text-foreground">
                          {ev.title}
                        </h5>
                        {ev.subtitle ? (
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {ev.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-left sm:text-right pt-1 sm:pt-0">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <CalendarIcon className="size-3.5" />
                        {formatDate(ev.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center space-y-2">
              <CalendarIcon className="mx-auto size-7 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">
                Tidak ada agenda pada tanggal ini
              </p>
              <p className="text-xs text-muted-foreground">
                Pilih tanggal bertanda atau klik &ldquo;Tampilkan Semua Bulan Ini&rdquo; untuk melihat seluruh jadwal.
              </p>
            </div>
          )
        ) : (
          // Events for full month
          currentMonthEvents.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentMonthEvents.map((ev) => {
                const style = getEventStyle(ev);
                const Icon = style.icon;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedDate(ev.date)}
                    className="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3.5 transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer"
                  >
                    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", style.pill)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", style.pill)}>
                          {ev.categoryLabel}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatDate(ev.date)}
                        </span>
                      </div>
                      <p className="font-heading text-xs sm:text-sm font-semibold text-foreground truncate">
                        {ev.title}
                      </p>
                      {ev.subtitle ? (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ev.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center space-y-2">
              <CalendarIcon className="mx-auto size-7 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">
                Tidak ada peristiwa di bulan {format(currentMonth, "MMMM yyyy", { locale: localeId })}
              </p>
              <p className="text-xs text-muted-foreground">
                Gunakan panah navigasi bulan di atas untuk memeriksa bulan jadwal sebelum atau sesudahnya.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
