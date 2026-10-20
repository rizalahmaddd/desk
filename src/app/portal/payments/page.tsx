import { AlertTriangle, CircleCheckBig, Clock3, FileCheck2, Wallet } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PaymentClaimDialog } from "@/components/payment-claim-dialog";
import { PaymentStatusBadge, TermStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import { getPayments, getProjectSummary, getTermsWithTotals } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { formatDate, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalPaymentsPage() {
  const context = await requireShare();

  if (!context.access.canViewFinancials) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center">
        <Wallet className="mx-auto mb-3 size-8 text-muted-foreground/80" />
        <h1 className="font-heading text-lg font-bold text-foreground">
          Informasi Pembayaran Tidak Dibagikan
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Freelancer memilih untuk tidak menampilkan rincian tagihan finansial di portal ini. Silakan hubungi langsung freelancer untuk urusan invoice.
        </p>
      </div>
    );
  }

  const db = await getDb();
  const [summary, terms, payments] = await Promise.all([
    getProjectSummary(db, context.project.id),
    getTermsWithTotals(db, context.project.id),
    getPayments(db, context.project.id),
  ]);

  const project = context.project;
  const remaining = Math.max(project.totalAmount - summary.paid, 0);

  return (
    <div className="space-y-8">
      {/* Header & Quick Claim Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Status Pembayaran & Tagihan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Transparansi rincian biaya, termin yang perlu diselesaikan, dan riwayat transaksi terkonfirmasi.
          </p>
        </div>

        {context.access.scope === "comment" ? (
          <PaymentClaimDialog projectId={project.id} />
        ) : null}
      </div>

      {/* Metrics Row */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Total Nilai Kontrak"
          value={formatMoney(project.totalAmount, project.currency)}
          icon={Wallet}
          hint="Keseluruhan kesepakatan project"
        />
        <StatCard
          label="Sudah Dibayar"
          value={formatMoney(summary.paid, project.currency)}
          icon={CircleCheckBig}
          tone="success"
          hint="Pembayaran terverifikasi"
        />
        <StatCard
          label="Sisa Tagihan"
          value={formatMoney(remaining, project.currency)}
          icon={Clock3}
          tone={remaining > 0 ? "warning" : "success"}
          hint={remaining > 0 ? "Menunggu pelunasan" : "Seluruh tagihan telah lunas"}
        />
      </div>

      {summary.paid > project.totalAmount ? (
        <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="size-4 text-amber-700 dark:text-amber-300" />
          <AlertDescription className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            Total pembayaran Anda melebihi nilai kontrak sebesar{" "}
            <strong>
              {formatMoney(
                summary.paid - project.totalAmount,
                project.currency,
              )}
            </strong>
            . Silakan hubungi studio jika terdapat penyesuaian add-on pekerjaan.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Termin Cards */}
      {terms.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Jadwal Termin Pembayaran
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {terms.map((term) => {
              const progress =
                term.amount > 0
                  ? Math.min((term.paid / term.amount) * 100, 100)
                  : 0;
              const overdue = isOverdue(term.dueDate) && term.computedStatus !== "paid";

              return (
                <div
                  key={term.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-base font-semibold text-foreground">
                          {term.label}
                        </p>
                        <TermStatusBadge status={term.computedStatus} />
                      </div>
                      {overdue ? (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          Lewat Jatuh Tempo
                        </span>
                      ) : null}
                    </div>
                    <span className="font-heading text-base font-bold text-foreground tabular-nums">
                      {formatMoney(term.amount, project.currency)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">
                        Terbayar: {formatMoney(term.paid, project.currency)}
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          term.computedStatus === "paid"
                            ? "bg-emerald-500"
                            : "bg-primary",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {term.dueDate ? (
                    <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                      Jatuh tempo: {formatDate(term.dueDate)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Transaction History Ledger */}
      <div className="space-y-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Riwayat Pembayaran Masuk
        </h2>

        {payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-10 text-center">
            <p className="font-heading text-sm font-semibold text-foreground">Belum ada riwayat transaksi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Setelah Anda mentransfer dan mengirim konfirmasi, riwayat transaksi akan diverifikasi dan dicatat di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <div className="divide-y divide-border/60">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/10"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-base font-bold text-foreground tabular-nums">
                        {formatMoney(payment.amount, payment.currency)}
                      </p>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.paidAt)} · {payment.method ?? "Transfer Bank"}
                      {payment.term ? ` · ${payment.term.label}` : ""}
                    </p>
                    {payment.rejectedReason ? (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Catatan penolakan: {payment.rejectedReason}
                      </p>
                    ) : null}
                  </div>

                  {payment.proof ? (
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs font-medium shadow-2xs self-start sm:self-auto">
                      <a
                        href={`/api/files/${payment.proof.id}?preview=1`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileCheck2 className="size-3.5 text-primary" />
                        <span>Bukti Transfer</span>
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
