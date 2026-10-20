"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Coins,
  FileCheck2,
  MessageCircle,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Payment, PaymentTerm } from "@/lib/db/schema";
import { PAYMENT_METHODS } from "@/lib/constants";
import {
  createPaymentAction,
  createTermAction,
  decidePaymentAction,
  deletePaymentAction,
  deleteTermAction,
} from "@/app/actions/payments";
import { useActionForm } from "@/hooks/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { FileUploader } from "@/components/file-uploader";
import { PaymentStatusBadge, TermStatusBadge } from "@/components/status-badge";
import { UrgencyBadge } from "@/components/urgency-badge";
import {
  buildWhatsAppUrl,
  formatInvoiceReminderText,
  formatReceiptNotificationText,
} from "@/lib/whatsapp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, isOverdue, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type TermWithTotals = PaymentTerm & {
  paid: number;
  computedStatus: string;
};

type PaymentWithTerm = Payment & {
  term: PaymentTerm | null;
  proof: { id: string; filename: string } | null;
};

function CreateTermDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useActionForm(
    createTermAction.bind(null, projectId),
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs">
          <Plus className="size-3.5" />
          <span>Tambah Termin</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Tambah Termin Penagihan</DialogTitle>
          <DialogDescription>
            Bagi nilai project ke dalam beberapa tahap penagihan (misal: DP 50%, Pelunasan 50%).
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {state?.error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="label" className="text-xs font-semibold">Nama Termin</Label>
            <Input id="label" name="label" className="h-11 rounded-xl" placeholder="Contoh: Pembayaran Uang Muka (DP 50%)" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-semibold">Nominal Pembayaran (Rp)</Label>
            <Input
              id="amount"
              name="amount"
              className="h-11 rounded-xl tabular-nums"
              inputMode="numeric"
              placeholder="7500000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-xs font-semibold">Tanggal Jatuh Tempo</Label>
            <Input id="dueDate" name="dueDate" type="date" className="h-11 rounded-xl" />
          </div>
          <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs" pending={pending}>
            Simpan Termin
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreatePaymentDialog({
  projectId,
  currency,
  terms,
}: {
  projectId: string;
  currency: string;
  terms: TermWithTotals[];
}) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<{ id: string } | null>(null);
  const { state, formAction, pending } = useActionForm(
    createPaymentAction.bind(null, projectId),
    {
      onSuccess: () => {
        setOpen(false);
        setProof(null);
      },
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-xs">
          <Plus className="size-3.5" />
          <span>Catat Pembayaran</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Catat Pembayaran Masuk</DialogTitle>
          <DialogDescription>
            Pembayaran yang diverifikasi akan otomatis mengurangi sisa tagihan project.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {state?.error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-semibold">Nominal Masuk (Rp)</Label>
            <Input
              id="amount"
              name="amount"
              className="h-11 rounded-xl tabular-nums font-semibold"
              inputMode="numeric"
              placeholder="5000000"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="paidAt" className="text-xs font-semibold">Tanggal Bayar</Label>
              <Input
                id="paidAt"
                name="paidAt"
                type="date"
                className="h-11 rounded-xl"
                defaultValue={todayISO()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method" className="text-xs font-semibold">Metode</Label>
              <NativeSelect id="method" name="method" defaultValue="Transfer bank" className="h-11 rounded-xl">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="termId" className="text-xs font-semibold">Tautkan ke Termin (Opsional)</Label>
            <NativeSelect id="termId" name="termId" defaultValue="" className="h-11 rounded-xl">
              <option value="">Tanpa termin khusus</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label} ({formatMoney(term.amount, currency)})
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note" className="text-xs font-semibold">Nomor Referensi / Catatan</Label>
            <Textarea
              id="note"
              name="note"
              rows={2}
              className="rounded-xl text-sm"
              placeholder="Contoh: Transfer via BCA No. Ref #123456"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Bukti Transfer (Opsional)</Label>
            <FileUploader
              projectId={projectId}
              accept="image/*,application/pdf"
              maxFiles={1}
              label="Upload bukti pembayaran"
              onUploaded={(files) => setProof(files[0] ?? null)}
            />
            {proof ? (
              <input type="hidden" name="proofAttachmentId" value={proof.id} />
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status" className="text-xs font-semibold">Status Awal</Label>
            <NativeSelect id="status" name="status" defaultValue="verified" className="h-11 rounded-xl">
              <option value="verified">Langsung Terverifikasi</option>
              <option value="pending">Menunggu Verifikasi Manual</option>
            </NativeSelect>
          </div>
          <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs" pending={pending}>
            Simpan Pembayaran
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentActions({
  projectId,
  payment,
  projectName,
  clientName,
  clientPhone,
}: {
  projectId: string;
  payment: PaymentWithTerm;
  projectName?: string;
  clientName?: string | null;
  clientPhone?: string | null;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [state, formAction] = useActionState(
    decidePaymentAction.bind(null, projectId),
    null,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {payment.proof ? (
        <Button asChild variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs font-medium shadow-2xs">
          <a
            href={`/api/files/${payment.proof.id}?preview=1`}
            target="_blank"
            rel="noreferrer"
          >
            <FileCheck2 className="size-3.5 text-primary" />
            <span>Lihat Bukti</span>
          </a>
        </Button>
      ) : null}

      <Button asChild variant="ghost" size="icon-sm" className="size-8 rounded-lg text-muted-foreground hover:text-foreground" aria-label="Kuitansi">
        <Link href={`/projects/${projectId}/payments/${payment.id}/receipt`}>
          <ReceiptText className="size-3.5" />
        </Link>
      </Button>

      {payment.status === "verified" ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs font-medium border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 shadow-2xs"
          onClick={() => {
            const receiptUrl =
              typeof window !== "undefined"
                ? `${window.location.origin}/projects/${projectId}/payments/${payment.id}/receipt`
                : null;
            const text = formatReceiptNotificationText({
              clientName,
              projectName: projectName || "Project",
              invoiceNo: payment.invoiceNo,
              amount: payment.amount,
              currency: payment.currency,
              paidAt: payment.paidAt,
              method: payment.method,
              portalUrl: receiptUrl,
            });
            window.open(
              buildWhatsAppUrl(clientPhone, text),
              "_blank",
              "noopener,noreferrer",
            );
          }}
          aria-label="Kirim Kwitansi via WhatsApp"
        >
          <MessageCircle className="size-3.5 fill-[#25D366]" />
          <span className="hidden sm:inline">Kirim Kwitansi WA</span>
          <span className="sm:hidden">WA</span>
        </Button>
      ) : null}

      {payment.status === "pending" ? (
        <>
          <form action={formAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="decision" value="verify" />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              aria-label="Verifikasi pembayaran"
            >
              <Check className="size-3.5" />
              <span>Verifikasi</span>
            </Button>
          </form>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-500/10"
                aria-label="Tolak klaim"
              >
                <X className="size-3.5" />
                <span>Tolak</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Tolak Klaim Pembayaran</DialogTitle>
                <DialogDescription>
                  Tuliskan alasan penolakan agar client dapat mengoreksi data atau mengirim ulang bukti.
                </DialogDescription>
              </DialogHeader>
              <form action={formAction} className="space-y-4 pt-2">
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="decision" value="reject" />
                <Textarea
                  name="reason"
                  rows={3}
                  className="rounded-xl text-sm"
                  placeholder="Contoh: Bukti transfer tidak jelas / dana belum masuk rekening."
                  required
                />
                <SubmitButton className="h-11 w-full rounded-xl" variant="destructive">
                  Tolak Klaim Ini
                </SubmitButton>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
            aria-label="Batalkan pembayaran"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pembayaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Pembayaran ini akan ditandai dibatalkan dan tidak lagi dihitung dalam total terbayar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const result = await deletePaymentAction(projectId, payment.id);
                if (result?.error) toast.error(result.error);
                else toast.success(result?.success ?? "Pembayaran dibatalkan.");
              }}
            >
              Batalkan Pembayaran
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PaymentsManager({
  projectId,
  currency,
  projectName,
  clientName,
  clientPhone,
  portalUrl,
  terms,
  payments,
}: {
  projectId: string;
  currency: string;
  projectName?: string;
  clientName?: string | null;
  clientPhone?: string | null;
  portalUrl?: string | null;
  terms: TermWithTotals[];
  payments: PaymentWithTerm[];
}) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
            Termin & Penagihan
          </h3>
          <p className="text-xs text-muted-foreground">
            {terms.length} termin diatur · {payments.length} riwayat transaksi tercatat
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateTermDialog projectId={projectId} />
          <CreatePaymentDialog
            projectId={projectId}
            currency={currency}
            terms={terms}
          />
        </div>
      </div>

      {/* Termin Progress Cards */}
      <div className="space-y-3">
        <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Jadwal Termin Pembayaran
        </h4>

        {terms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-center text-xs sm:text-sm text-muted-foreground">
            Belum ada termin penagihan. Anda tetap dapat langsung mencatat pembayaran masuk tanpa termin.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {terms.map((term) => {
              const progress =
                term.amount > 0 ? Math.min((term.paid / term.amount) * 100, 100) : 0;
              const overdue = isOverdue(term.dueDate) && term.computedStatus !== "paid";

              return (
                <div
                  key={term.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs transition-colors hover:border-border"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading text-base font-semibold text-foreground">
                            {term.label}
                          </p>
                          <TermStatusBadge status={term.computedStatus} />
                          <UrgencyBadge
                            dueDate={term.dueDate}
                            isCompleted={term.computedStatus === "paid"}
                          />
                        </div>
                        {overdue ? (
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            Lewat Jatuh Tempo
                          </span>
                        ) : null}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="size-7 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                        aria-label="Hapus termin"
                        disabled={pending === term.id}
                        onClick={async () => {
                          setPending(term.id);
                          const result = await deleteTermAction(projectId, term.id);
                          setPending(null);
                          if (result?.error) toast.error(result.error);
                          else toast.success(result?.success ?? "Termin dihapus.");
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatMoney(term.paid, currency)} dari {formatMoney(term.amount, currency)}
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
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    <span>
                      {term.dueDate ? `Jatuh tempo: ${formatDate(term.dueDate)}` : "Jatuh tempo fleksibel"}
                    </span>

                    {term.computedStatus !== "paid" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 rounded-lg text-[11px] font-semibold border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 shadow-2xs"
                        onClick={() => {
                          const text = formatInvoiceReminderText({
                            clientName,
                            projectName: projectName || "Project",
                            termLabel: term.label,
                            amount: term.amount - term.paid,
                            currency,
                            dueDate: term.dueDate,
                            portalUrl,
                          });
                          window.open(
                            buildWhatsAppUrl(clientPhone, text),
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                      >
                        <MessageCircle className="size-3.5 fill-[#25D366]" />
                        <span>Tagih via WA</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment History List */}
      <div className="space-y-3">
        <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Riwayat Transaksi Masuk
        </h4>

        {payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-10 text-center">
            <Coins className="mx-auto mb-2 size-8 text-muted-foreground/80" />
            <p className="font-heading text-sm font-semibold text-foreground">
              Belum ada riwayat pembayaran
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pembayaran yang Anda catat atau dilaporkan client akan terdaftar di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] gap-3 border-b border-border/70 bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Nominal & Invoice</span>
              <span>Tanggal</span>
              <span>Metode</span>
              <span>Status</span>
              <span className="text-right">Tindakan</span>
            </div>
            <div className="divide-y divide-border/60">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid gap-2.5 px-5 py-4 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] md:items-center md:gap-3 transition-colors hover:bg-muted/10"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-heading text-sm sm:text-base font-bold text-foreground tabular-nums">
                      {formatMoney(payment.amount, payment.currency)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {payment.term?.label ?? "Pembayaran Langsung"} ·{" "}
                      <span className="font-mono font-medium">{payment.invoiceNo}</span>
                      {payment.submittedBy === "client" ? (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                          Klaim Client
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground md:text-sm font-medium">
                    {formatDate(payment.paidAt)}
                  </p>
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {payment.method ?? "Transfer Bank"}
                  </p>
                  <div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <PaymentActions
                    projectId={projectId}
                    payment={payment}
                    projectName={projectName}
                    clientName={clientName}
                    clientPhone={clientPhone}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
