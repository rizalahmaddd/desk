"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  CreditCard,
  Filter,
  Milestone as MilestoneIcon,
  Receipt,
  Sparkles,
} from "lucide-react";
import type { Activity, Milestone, Payment, Update } from "@/lib/db/schema";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimelineEventType = "milestone" | "update" | "payment" | "general";

type TimelineItem = {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  description?: string;
  badge?: string;
  tone?: "default" | "success" | "warning" | "info";
  actor?: string;
  meta?: string;
};

export function ProjectTimelineFeed({
  milestones,
  updates,
  payments,
  activity,
  currency,
}: {
  milestones: Milestone[];
  updates: Update[];
  payments: (Payment & { term?: { label: string } | null })[];
  activity: Activity[];
  currency: string;
}) {
  const [filter, setFilter] = useState<TimelineEventType | "all">("all");

  const items = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [];

    // Add Milestones
    for (const m of milestones) {
      if (m.completedAt) {
        list.push({
          id: `m-done-${m.id}`,
          type: "milestone",
          date: new Date(m.completedAt),
          title: `Milestone Rampung: ${m.title}`,
          description: m.description ?? undefined,
          badge: "Selesai",
          tone: "success",
          meta: `Bobot ${m.weight}`,
        });
      }
      if (m.createdAt) {
        list.push({
          id: `m-create-${m.id}`,
          type: "milestone",
          date: new Date(m.createdAt),
          title: `Target Milestone Ditambahkan: ${m.title}`,
          description: m.dueDate ? `Target deadline: ${formatDate(m.dueDate)}` : undefined,
          badge: "Fase Kerja",
          tone: "info",
        });
      }
    }

    // Add Updates
    for (const u of updates) {
      list.push({
        id: `u-${u.id}`,
        type: "update",
        date: new Date(u.createdAt),
        title: u.title,
        description: u.body ?? undefined,
        badge: u.visibility === "internal" ? "Internal Studio" : "Diumumkan ke Client",
        tone: "info",
      });
    }

    // Add Payments
    for (const p of payments) {
      list.push({
        id: `p-${p.id}`,
        type: "payment",
        date: new Date(p.paidAt),
        title: `Pembayaran ${formatMoney(p.amount, currency)}`,
        description: `Nomor Invoice: ${p.invoiceNo} · Metode: ${p.method ?? "Transfer Bank"}`,
        badge: p.status === "verified" ? "Terverifikasi" : p.status === "pending" ? "Menunggu Verifikasi" : p.status,
        tone: p.status === "verified" ? "success" : "warning",
        actor: p.submittedBy === "client" ? "Dilaporkan oleh Client" : "Dicatat oleh Studio",
      });
    }

    // Add General Activity that isn't already covered
    for (const a of activity) {
      if (
        a.action === "project_created" ||
        a.action === "access_created" ||
        a.action === "access_rotated" ||
        a.action === "comment_created"
      ) {
        const titleMap: Record<string, string> = {
          project_created: "Project Berhasil Dibuat",
          access_created: "Tautan Portal Akses Client Dibuat",
          access_rotated: "Kunci Akses Portal Client Diperbarui",
          comment_created: "Pesan atau Catatan Baru Ditambahkan",
        };

        list.push({
          id: `act-${a.id}`,
          type: "general",
          date: new Date(a.createdAt),
          title: titleMap[a.action] ?? a.action,
          actor: a.actorType === "client" ? "Client" : a.actorType === "owner" ? "Anda" : "Sistem",
        });
      }
    }

    // Sort descending by date
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [milestones, updates, payments, activity, currency]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      milestone: items.filter((i) => i.type === "milestone").length,
      update: items.filter((i) => i.type === "update").length,
      payment: items.filter((i) => i.type === "payment").length,
    }),
    [items],
  );

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-xl font-medium"
          onClick={() => setFilter("all")}
        >
          <Filter className="size-3.5" />
          <span>Semua Kronologi</span>
          <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
            {counts.all}
          </span>
        </Button>

        <Button
          variant={filter === "milestone" ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-xl font-medium"
          onClick={() => setFilter("milestone")}
        >
          <MilestoneIcon className="size-3.5" />
          <span>Milestone</span>
          <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
            {counts.milestone}
          </span>
        </Button>

        <Button
          variant={filter === "update" ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-xl font-medium"
          onClick={() => setFilter("update")}
        >
          <Sparkles className="size-3.5" />
          <span>Update & Deliverables</span>
          <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
            {counts.update}
          </span>
        </Button>

        <Button
          variant={filter === "payment" ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-xl font-medium"
          onClick={() => setFilter("payment")}
        >
          <CreditCard className="size-3.5" />
          <span>Pembayaran</span>
          <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
            {counts.payment}
          </span>
        </Button>
      </div>

      {/* Timeline Stream Feed */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock className="mx-auto size-8 text-muted-foreground/60" />
            <p className="font-heading text-sm font-semibold text-foreground">
              Tidak ada catatan pada filter ini
            </p>
            <p className="text-xs text-muted-foreground">
              Aktivitas dan pembaruan akan otomatis tercatat di kronologi ini.
            </p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {filteredItems.map((item, index) => {
              const isMilestone = item.type === "milestone";
              const isUpdate = item.type === "update";
              const isPayment = item.type === "payment";
              const isLast = index === filteredItems.length - 1;

              return (
                <div key={item.id} className="flex items-stretch gap-3 sm:gap-4">
                  {/* Event Marker & Connector Line */}
                  <div className="flex w-7 sm:w-8 shrink-0 flex-col items-center">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 bg-background ring-4 ring-card",
                        item.tone === "success" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                        item.tone === "warning" && "border-amber-500 text-amber-600 dark:text-amber-400",
                        item.tone === "info" && "border-primary text-primary",
                        item.tone === "default" && "border-border/80 text-muted-foreground",
                      )}
                    >
                      {isMilestone ? (
                        <MilestoneIcon className="size-3" />
                      ) : isUpdate ? (
                        <Sparkles className="size-3" />
                      ) : isPayment ? (
                        <Receipt className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 bg-border/70 my-1" />}
                  </div>

                  {/* Event Content */}
                  <div className="min-w-0 flex-1 pb-6">
                    <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5 sm:p-4 space-y-1.5 transition-colors hover:border-border">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        {item.badge ? (
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                              item.tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                              item.tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                              item.tone === "info" && "border-primary/20 bg-primary/10 text-primary",
                              item.tone === "default" && "border-border/60 bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>

                      <span
                        className="text-[11px] text-muted-foreground shrink-0"
                        title={formatDateTime(item.date)}
                      >
                        {formatRelative(item.date)}
                      </span>
                    </div>

                    {item.description ? (
                      <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {item.description}
                      </p>
                    ) : null}

                    {item.actor || item.meta ? (
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground/80">
                        {item.actor ? <span>Oleh: {item.actor}</span> : null}
                        {item.meta ? <span>· {item.meta}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
