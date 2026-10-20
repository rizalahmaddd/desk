import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CircleCheckBig,
  FolderKanban,
  Hourglass,
  Inbox,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getDashboardData, getSharedProjectsForUser } from "@/lib/queries";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const session = await requireOwner();
  const db = await getDb();
  const [{ projects, stats }, shared] = await Promise.all([
    getDashboardData(db, session.user.id),
    getSharedProjectsForUser(db, session.user.id),
  ]);
  const unopenedShared = shared.filter((item) => !item.lastOpenedAt).length;

  const firstName = session.user.name.split(" ")[0];
  const greeting = getTimeGreeting();

  return (
    <div className="space-y-8">
      {/* Studio Welcome & Actions */}
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Pantau perkembangan project aktif, verifikasi pembayaran client, dan jaga flow pekerjaan studio Anda."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
            <Sparkles className="size-3.5" />
            Studio Workspace
          </span>
        }
        actions={
          <Button asChild className="h-10 gap-2 rounded-xl font-medium shadow-xs">
            <Link href="/projects/new">
              <Plus className="size-4" />
              <span>Project Baru</span>
            </Link>
          </Button>
        }
      />

      {shared.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Inbox className="size-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-heading text-sm font-semibold text-foreground">
                {shared.length} project dibagikan ke Anda
              </p>
              <p className="text-xs text-muted-foreground">
                {unopenedShared > 0
                  ? `${unopenedShared} di antaranya belum pernah Anda buka.`
                  : "Pantau progress project tempat Anda menjadi client."}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-9 shrink-0 gap-1.5 rounded-xl font-medium">
            <Link href="/shared">
              <span>Lihat Project</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Actionable Pending Payment Verification Callout */}
      {stats.pendingClaims > 0 ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Hourglass className="size-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-heading text-sm font-semibold text-foreground">
                Klaim Pembayaran Menunggu Konfirmasi
              </p>
              <p className="text-xs text-muted-foreground">
                Client telah melaporkan pembayaran senilai{" "}
                <strong className="font-semibold text-foreground">
                  {formatMoney(stats.pendingClaims)}
                </strong>
                .
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-medium"
          >
            <Link href="/projects?status=active">
              <span>Tinjau Pembayaran</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Financial & Studio Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Project Aktif"
          value={String(stats.activeProjects)}
          hint={`${stats.totalProjects} project tercatat`}
          icon={FolderKanban}
        />
        <StatCard
          label="Total Nilai Kontrak"
          value={formatMoney(stats.totalValue)}
          hint="Total seluruh project aktif & selesai"
          icon={Wallet}
        />
        <StatCard
          label="Sudah Diterima"
          value={formatMoney(stats.totalPaid)}
          tone="success"
          hint="Pembayaran terverifikasi"
          icon={CircleCheckBig}
        />
        <StatCard
          label="Sisa Tagihan"
          value={formatMoney(stats.remaining)}
          tone={stats.remaining > 0 ? "warning" : "success"}
          hint={stats.remaining > 0 ? "Menunggu pelunasan" : "Seluruh tagihan lunas"}
          icon={Hourglass}
        />
      </div>

      {/* Recent Projects */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Project Terkini
            </h2>
            <p className="text-xs text-muted-foreground">
              {projects.length} project dalam pengawasan studio
            </p>
          </div>
          {projects.length > 0 ? (
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl">
              <Link href="/projects">
                <span>Lihat Semua</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Belum ada project aktif"
            description="Buat project pertama, atur milestone dan termin pembayaran, lalu kirimkan link satu-klik ke client Anda."
            action={
              <Button asChild className="h-10 gap-2 rounded-xl font-medium shadow-xs">
                <Link href="/projects/new">
                  <Plus className="size-4" />
                  <span>Buat Project Pertama</span>
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                client={project.client}
                paid={project.paid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
