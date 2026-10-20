import Link from "next/link";
import {
  ArrowRight,
  CircleCheckBig,
  Clock3,
  Coins,
  ListChecks,
  Sparkles,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { MilestoneStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import {
  getActivity,
  getAttachments,
  getMilestones,
  getPayments,
  getProjectForOwner,
  getProjectSummary,
  getUpdates,
} from "@/lib/queries";
import { UpdatesPanel } from "@/components/updates-panel";
import { ProjectTimelineRoadmap } from "@/components/project-timeline-roadmap";
import type { Attachment } from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";
import { activityLabel } from "@/lib/activity-labels";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);
  if (!row) return null;

  const [summary, milestones, payments, activity, updates, files] =
    await Promise.all([
      getProjectSummary(db, id),
      getMilestones(db, id),
      getPayments(db, id),
      getActivity(db, id, 12),
      getUpdates(db, id, true),
      getAttachments(db, id),
    ]);

  const attachmentsByUpdate = files.reduce<Record<string, Attachment[]>>(
    (groups, file) => {
      if (file.entityType === "update" && file.entityId) {
        groups[file.entityId] = [...(groups[file.entityId] ?? []), file];
      }
      return groups;
    },
    {},
  );

  const { project } = row;
  const remaining = Math.max(project.totalAmount - summary.paid, 0);
  const doneMilestones = milestones.filter(
    (milestone) => milestone.status === "done",
  ).length;

  return (
    <div className="space-y-6">
      {/* Financial & Milestone Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-muted-foreground line-clamp-2 leading-snug">
              Milestone Selesai
            </p>
            <div className="flex size-7.5 sm:size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="size-4 sm:size-4.5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="font-heading text-lg sm:text-2xl xl:text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {doneMilestones}{" "}
                <span className="text-xs sm:text-base font-normal text-muted-foreground">
                  / {milestones.length}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-primary tabular-nums">
                {project.progressPercent}%
              </span>
            </div>
            <Progress value={project.progressPercent} className="h-1.5 bg-muted/80" />
          </div>
        </div>

        <StatCard
          label="Sudah Dibayar"
          value={formatMoney(summary.paid, project.currency)}
          hint={`${summary.verifiedCount} pembayaran terverifikasi`}
          icon={CircleCheckBig}
          tone="success"
        />

        <StatCard
          label="Sisa Tagihan"
          value={formatMoney(remaining, project.currency)}
          hint={`Total nilai ${formatMoney(project.totalAmount, project.currency)}`}
          icon={Wallet}
          tone={remaining > 0 ? "warning" : "success"}
        />

        <StatCard
          label="Menunggu Verifikasi"
          value={formatMoney(summary.pending, project.currency)}
          hint={`${summary.pendingCount} klaim dari client`}
          icon={Clock3}
          tone={summary.pendingCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Visual Milestone Roadmap Timeline */}
      <ProjectTimelineRoadmap
        project={project}
        milestones={milestones}
        compact
      />

      {/* Two Column Grid: Milestones & Recent Payments */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Milestone Card */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg">Milestone Pengerjaan</CardTitle>
              <CardDescription>Tahapan penyelesaian target pekerjaan</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl">
              <Link href={`/projects/${id}/milestones`}>
                <span>Kelola</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {milestones.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Belum ada milestone"
                description="Pecah project menjadi beberapa milestone terukur agar client dapat melihat kemajuan secara transparan."
                className="border-0 bg-transparent py-8"
                action={
                  <Button asChild size="sm" className="rounded-xl shadow-xs">
                    <Link href={`/projects/${id}/milestones`}>
                      Tambah Milestone
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border/60">
                {milestones.slice(0, 5).map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {milestone.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {milestone.dueDate
                          ? `Deadline ${formatDate(milestone.dueDate)}`
                          : "Tanpa deadline terikat"}
                      </p>
                    </div>
                    <MilestoneStatusBadge status={milestone.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg">Riwayat Pembayaran</CardTitle>
              <CardDescription>Termin dan transfer masuk terbaru</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl">
              <Link href={`/projects/${id}/payments`}>
                <span>Semua</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {payments.length === 0 ? (
              <EmptyState
                icon={Coins}
                title="Belum ada pembayaran"
                description="Catat pembayaran atau buat termin penagihan untuk project ini."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {payments.slice(0, 4).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-heading text-sm font-semibold text-foreground tabular-nums">
                        {formatMoney(payment.amount, payment.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paidAt)} ·{" "}
                        {payment.term?.label ?? payment.method ?? "Pembayaran"}
                      </p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Updates Panel Timeline */}
      <UpdatesPanel
        projectId={id}
        updates={updates}
        attachmentsByUpdate={attachmentsByUpdate}
      />

      {/* Activity Log */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg">Log Aktivitas Project</CardTitle>
            <CardDescription>Catatan perubahan status, pembayaran, dan interaksi portal</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada riwayat aktivitas tercatat.
            </p>
          ) : (
            <ol>
              {activity.map((item, index) => (
                <li key={item.id} className="flex gap-3">
                  <div className="flex w-3 shrink-0 flex-col items-center" aria-hidden="true">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/15" />
                    {index < activity.length - 1 ? (
                      <span className="mt-1.5 w-0.5 flex-1 rounded-full bg-border/70" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5 pb-4">
                    <p className="break-words text-sm font-medium text-foreground">
                      {activityLabel(item.action, item.metadata)}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(item.createdAt)}
                    >
                      {formatRelative(item.createdAt)} ·{" "}
                      <span className="font-medium">
                        {item.actorType === "client"
                          ? "Client"
                          : item.actorType === "owner"
                            ? "Anda"
                            : "Sistem"}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
