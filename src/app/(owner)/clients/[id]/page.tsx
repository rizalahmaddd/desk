import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  FolderKanban,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Wallet,
} from "lucide-react";
import { ProjectStatusBadge } from "@/components/status-badge";
import { ClientDialog } from "@/components/forms/client-dialog";
import { ClientDeleteButton } from "@/components/client-delete-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getClientForOwner } from "@/lib/queries";
import { formatDate, isOverdue } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const data = await getClientForOwner(db, session.user.id, id);
  return {
    title: data?.client ? `${data.client.name} — Detail Customer` : "Customer",
  };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const data = await getClientForOwner(db, session.user.id, id);

  if (!data) notFound();

  const { client, projects, stats } = data;
  const initial = client.name ? client.name.charAt(0).toUpperCase() : "C";
  const waLink = client.phone ? buildWhatsAppUrl(client.phone) : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground">
          <Link href="/clients">
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Daftar Customer</span>
          </Link>
        </Button>
      </div>

      {/* Customer Header Profile Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-heading text-xl sm:text-2xl font-bold text-primary shadow-xs">
              {initial}
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {client.name}
                </h1>
                {client.company ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Building2 className="size-3" />
                    {client.company}
                  </span>
                ) : null}
              </div>

              {/* Contact and Join Date */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span>{client.email}</span>
                  </a>
                ) : null}

                {client.phone ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${client.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span>{client.phone}</span>
                    </a>
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400 font-semibold"
                        title="Chat WhatsApp"
                      >
                        <MessageCircle className="size-3" />
                        <span>WhatsApp</span>
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <span className="inline-flex items-center gap-1.5 text-muted-foreground/80 py-1">
                  <CalendarDays className="size-3.5" />
                  Klien sejak {formatDate(client.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild className="h-10 gap-2 rounded-xl font-medium shadow-xs">
              <Link href={`/projects/new?clientId=${client.id}`}>
                <Plus className="size-4" />
                <span>Buat Project</span>
              </Link>
            </Button>
            <ClientDialog client={client} />
            <ClientDeleteButton clientId={client.id} clientName={client.name} />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Nilai Kontrak */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Kontrak
            </span>
            <Briefcase className="size-4 text-primary" />
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(stats.totalAmount, "IDR")}
          </div>
          <p className="text-xs text-muted-foreground">
            Akumulasi nilai seluruh project
          </p>
        </div>

        {/* Pembayaran Masuk */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sudah Diterima
            </span>
            <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(stats.totalPaid, "IDR")}
          </div>
          <p className="text-xs text-muted-foreground">
            Pembayaran telah diverifikasi
          </p>
        </div>

        {/* Sisa Tagihan */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sisa Tagihan
            </span>
            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(stats.pendingBalance, "IDR")}
          </div>
          <p className="text-xs text-muted-foreground">
            Belum tertagih atau pending
          </p>
        </div>

        {/* Total Project */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Project
            </span>
            <FolderKanban className="size-4 text-muted-foreground" />
          </div>
          <div className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums">
            {stats.totalProjects}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({stats.activeCount} Aktif)
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.completedCount} project berhasil diselesaikan
          </p>
        </div>
      </div>

      {/* Projects List Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Daftar Project Klien Ini
            </h3>
            <p className="text-xs text-muted-foreground">
              Semua kontrak pekerjaan dan histori deliverables untuk {client.name}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs">
              <Link href={`/projects?client=${client.id}`}>
                <span>Buka di Filter Project</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/60 p-10 text-center space-y-3">
            <FolderKanban className="mx-auto size-8 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="font-heading text-sm font-semibold text-foreground">
                Belum ada project untuk customer ini
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Mulai kontrak baru untuk {client.name} dengan menekan tombol buat project di bawah.
              </p>
            </div>
            <Button asChild size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-xs">
              <Link href={`/projects/new?clientId=${client.id}`}>
                <Plus className="size-3.5" />
                <span>Buat Project Pertama</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const overdue = isOverdue(project.dueDate) && project.status === "active";
              return (
                <div
                  key={project.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border/80 bg-card/60 p-4 transition-all hover:border-primary/40 hover:shadow-2xs"
                >
                  <div className="min-w-0 space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectStatusBadge status={project.status} />
                      <span className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        {project.code}
                      </span>
                      {overdue ? (
                        <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                          Lewat Tenggat
                        </span>
                      ) : null}
                    </div>

                    <Link
                      href={`/projects/${project.id}`}
                      className="font-heading text-base font-bold text-foreground transition-colors hover:text-primary block truncate"
                    >
                      {project.name}
                    </Link>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 max-w-md pt-1">
                      <Progress value={project.progressPercent} className="h-2 flex-1 bg-muted/80" />
                      <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                        {project.progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Financial & Deadline stats */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    <div className="text-left sm:text-right text-xs">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Nilai Kontrak
                      </span>
                      <span className="font-heading font-bold text-foreground">
                        {formatMoney(project.totalAmount, project.currency)}
                      </span>
                    </div>

                    <div className="text-left sm:text-right text-xs">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Target Selesai
                      </span>
                      <span className="text-muted-foreground">
                        {project.dueDate ? formatDate(project.dueDate) : "Fleksibel"}
                      </span>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="h-8 gap-1 rounded-lg text-xs font-semibold">
                      <Link href={`/projects/${project.id}`}>
                        <span>Buka</span>
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
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
