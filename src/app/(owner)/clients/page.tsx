import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ClientDialog } from "@/components/forms/client-dialog";
import { ClientDeleteButton } from "@/components/client-delete-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getClientsForOwner } from "@/lib/queries";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Daftar Customer" };
export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOwner();
  const params = await searchParams;
  const db = await getDb();
  const clients = await getClientsForOwner(db, session.user.id, {
    query: params.q,
  });

  // Calculate high-level metrics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.activeProjectsCount > 0).length;
  const totalValue = clients.reduce((acc, c) => acc + c.totalAmount, 0);
  const totalPaid = clients.reduce((acc, c) => acc + c.totalPaid, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Customer"
        description="Kelola direktori kontak klien, riwayat kontrak kerja sama, dan pantau status pembayaran per pelanggan."
        actions={<ClientDialog />}
      />

      {/* KPI Highlight Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Customer */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Customer
            </span>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <div className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {totalClients}
          </div>
          <p className="text-xs text-muted-foreground">
            Klien terdata dalam database studio
          </p>
        </div>

        {/* Klien Aktif */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Klien Aktif
            </span>
            <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {activeClients}
          </div>
          <p className="text-xs text-muted-foreground">
            Sedang memiliki project aktif berjalan
          </p>
        </div>

        {/* Akumulasi Nilai Kontrak */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Nilai Kontrak
            </span>
            <Briefcase className="size-4 text-primary" />
          </div>
          <div className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(totalValue, "IDR")}
          </div>
          <p className="text-xs text-muted-foreground">
            Akumulasi seluruh kontrak project
          </p>
        </div>

        {/* Dana Diterima */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pembayaran Diterima
            </span>
            <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(totalPaid, "IDR")}
          </div>
          <p className="text-xs text-muted-foreground">
            Dana invoice yang telah diverifikasi
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <form className="relative flex-1" method="get">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={params.q}
            placeholder="Cari nama PIC, perusahaan, email, atau no. telepon..."
            className="h-11 rounded-xl pl-10 pr-4 text-sm shadow-2xs"
          />
        </form>
      </div>

      {/* Customer List Grid */}
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={params.q ? "Tidak ada customer yang cocok" : "Belum ada customer"}
          description={
            params.q
              ? "Coba kata kunci pencarian lain atau bersihkan input pencarian."
              : "Tambahkan data customer pertama Anda untuk mengelompokkan project dan memantau riwayat klien."
          }
          action={
            params.q ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/clients">Bersihkan Pencarian</Link>
              </Button>
            ) : (
              <ClientDialog />
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const initial = client.name ? client.name.charAt(0).toUpperCase() : "C";
            const phoneDigits = client.phone ? client.phone.replace(/\D/g, "") : null;
            const waLink = phoneDigits
              ? `https://wa.me/${phoneDigits.startsWith("0") ? `62${phoneDigits.slice(1)}` : phoneDigits}`
              : null;

            return (
              <div
                key={client.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-4">
                  {/* Top Bar: Initial Avatar & Company */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-base font-bold text-primary shadow-2xs">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-heading text-base font-bold text-foreground transition-colors hover:text-primary truncate block"
                        >
                          {client.name}
                        </Link>
                        {client.company ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <Building2 className="size-3 shrink-0" />
                            <span className="truncate">{client.company}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Klien Individu
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {client.projectCount} Project
                    </span>
                  </div>

                  {/* Contact Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <Mail className="size-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{client.email}</span>
                      </a>
                    ) : null}

                    {client.phone ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${client.phone}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          <Phone className="size-3 text-muted-foreground" />
                          <span>{client.phone}</span>
                        </a>
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex size-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors dark:text-emerald-400"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Financial Stats Summary */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Nilai Kontrak
                      </span>
                      <span className="font-heading font-bold text-foreground">
                        {formatMoney(client.totalAmount, "IDR")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Terbayar
                      </span>
                      <span className="font-heading font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(client.totalPaid, "IDR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm" variant="ghost" className="h-8 gap-1 rounded-lg text-xs font-semibold">
                      <Link href={`/clients/${client.id}`}>
                        <span>Detail</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                      <Link href={`/projects?client=${client.id}`}>
                        Project
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <ClientDialog client={client} />
                    <ClientDeleteButton clientId={client.id} clientName={client.name} />
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
