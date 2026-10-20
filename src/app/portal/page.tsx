import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleCheckBig,
  Clock3,
  CreditCard,
  ListChecks,
  Sparkles,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MilestoneStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import { getPortalProjectData } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { formatDate, formatRelative, isOverdue } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PortalOverviewPage() {
  const context = await requireShare();
  const db = await getDb();
  const data = await getPortalProjectData(
    db,
    context.project.id,
    context.access.canViewFinancials,
  );

  const project = context.project;
  const remaining = data.summary
    ? Math.max(project.totalAmount - data.summary.paid, 0)
    : 0;
  const overdue = isOverdue(project.dueDate) && project.status === "active";
  const completedMilestones = data.milestones.filter((m) => m.status === "done").length;

  return (
    <div className="space-y-8">
      {/* Client Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Progres Pengerjaan Project
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
            <p className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {project.dueDate
                ? `${overdue ? "Target tenggat waktu:" : "Estimasi selesai:"} ${formatDate(project.dueDate)}`
                : "Jadwal fleksibel tanpa tenggat waktu ketat"}
            </p>
          </div>

          {context.access.canViewFinancials && remaining > 0 ? (
            <Button asChild className="h-10 gap-2 rounded-xl font-medium shadow-xs self-start sm:self-auto">
              <Link href="/portal/payments">
                <CreditCard className="size-4" />
                <span>Konfirmasi Pembayaran</span>
              </Link>
            </Button>
          ) : null}
        </div>

        {/* Progress Gauge */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              Tingkat Kesiapan Project
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">
                {completedMilestones} dari {data.milestones.length} milestone rampung
              </span>
              <span className="font-heading text-xl font-bold text-foreground tabular-nums">
                {project.progressPercent}%
              </span>
            </div>
          </div>
          <Progress value={project.progressPercent} className="h-2.5 bg-muted/80" />
        </div>
      </div>

      {/* Financial Metric Highlights (If Enabled) */}
      {context.access.canViewFinancials && data.summary ? (
        <div className="grid gap-3.5 sm:grid-cols-3">
          <StatCard
            label="Total Terbayar"
            value={formatMoney(data.summary.paid, project.currency)}
            icon={CircleCheckBig}
            tone="success"
            hint="Dana telah terkonfirmasi"
          />
          <StatCard
            label="Sisa Tagihan"
            value={formatMoney(remaining, project.currency)}
            icon={Wallet}
            tone={remaining > 0 ? "warning" : "success"}
            hint={remaining > 0 ? "Menunggu penyelesaian termin" : "Seluruh tagihan telah lunas"}
          />
          <StatCard
            label="Klaim Menunggu Verifikasi"
            value={formatMoney(data.summary.pending, project.currency)}
            icon={Clock3}
            tone={data.summary.pendingCount > 0 ? "warning" : "default"}
            hint={data.summary.pendingCount > 0 ? "Sedang ditinjau oleh studio" : "Tidak ada klaim tertunda"}
          />
        </div>
      ) : null}

      {/* Two Column Content: Milestones & Recent Payments / Updates */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Milestone Tracker Card */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg">Tahapan Milestone</CardTitle>
              <CardDescription>Status kemajuan pekerjaan target</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl">
              <Link href="/portal/progress">
                <span>Detail</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {data.milestones.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Belum ada milestone"
                description="Freelancer belum menambahkan tahapan milestone untuk project ini."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {data.milestones.slice(0, 5).map((milestone) => (
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
                          ? `Target ${formatDate(milestone.dueDate)}`
                          : "Tanpa tenggat khusus"}
                      </p>
                    </div>
                    <MilestoneStatusBadge status={milestone.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments or Updates Card */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg">
                {data.summary ? "Riwayat Pembayaran" : "Update Terbaru"}
              </CardTitle>
              <CardDescription>
                {data.summary ? "Catatan transfer & termin" : "Kabar pengerjaan terkini"}
              </CardDescription>
            </div>
            {data.summary ? (
              <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl">
                <Link href="/portal/payments">
                  <span>Semua</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="pt-2">
            {data.summary ? (
              data.payments.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Belum ada pembayaran"
                  description="Riwayat pembayaran dan konfirmasi termin akan ditampilkan di sini."
                  className="border-0 bg-transparent py-8"
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {data.payments.slice(0, 4).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-heading text-sm font-bold text-foreground tabular-nums">
                          {formatMoney(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.paidAt)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                  ))}
                </div>
              )
            ) : data.updates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada update pekerjaan dari studio.
              </p>
            ) : (
              <div className="space-y-3">
                {data.updates.slice(0, 3).map((update) => (
                  <div key={update.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                    <p className="font-heading text-sm font-semibold text-foreground">{update.title}</p>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {update.body}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 font-medium">
                      {formatRelative(update.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discussion Card */}
      <Card className="rounded-2xl border-border/80 shadow-xs">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg">Diskusi & Komentar</CardTitle>
            <CardDescription>Saluran komunikasi langsung antara Anda dan studio</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl">
            <Link href="/portal/comments">
              <span>Buka Diskusi</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          {data.comments.filter((comment) => !comment.deletedAt).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Belum ada pesan. Buka tab diskusi untuk mulai berkomunikasi.
            </div>
          ) : (
            <div className="space-y-3">
              {data.comments
                .filter((comment) => !comment.deletedAt)
                .slice(-3)
                .map((comment) => (
                  <div key={comment.id} className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-xs font-semibold text-foreground">
                          {comment.authorName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelative(comment.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
