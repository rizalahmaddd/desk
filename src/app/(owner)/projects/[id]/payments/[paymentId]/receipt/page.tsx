import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { and, eq, isNull, sql } from "drizzle-orm";
import { PrintButton } from "@/components/print-button";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "@/components/status-badge";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import {
  clients,
  paymentTerms,
  payments,
  projects,
  user,
} from "@/lib/db/schema";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;
  const session = await requireOwner();
  const db = await getDb();

  const [row] = await db
    .select({
      payment: payments,
      term: paymentTerms,
      project: projects,
      client: clients,
      owner: user,
    })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(paymentTerms, eq(payments.termId, paymentTerms.id))
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.projectId, id),
        eq(projects.ownerId, session.user.id),
        isNull(payments.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const [totals] = await db
    .select({
      paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.projectId, id),
        eq(payments.status, "verified"),
        isNull(payments.deletedAt),
      ),
    );

  const { payment, term, project, client, owner } = row;
  const totalPaid = Number(totals?.paid ?? 0);
  const remaining = Math.max(project.totalAmount - totalPaid, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2">
          <Link href={`/projects/${id}/payments`}>
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="print-surface rounded-2xl border bg-white p-8 text-zinc-900 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b pb-6">
          <div className="space-y-2">
            <Logo className="text-zinc-900 [&_span:first-child]:bg-zinc-900 [&_span:first-child]:text-white" />
            <p className="text-xs text-zinc-500">{owner.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Kuitansi
            </p>
            <p className="text-sm font-semibold">{payment.invoiceNo}</p>
            <p className="text-xs text-zinc-500">
              {formatDate(payment.paidAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Ditagihkan kepada
            </p>
            <p className="mt-1 text-sm font-semibold">
              {client?.name ?? "Client"}
            </p>
            {client?.company ? (
              <p className="text-sm text-zinc-600">{client.company}</p>
            ) : null}
            {client?.email ? (
              <p className="text-sm text-zinc-600">{client.email}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Project
            </p>
            <p className="mt-1 text-sm font-semibold">{project.name}</p>
            <p className="text-sm text-zinc-600">{project.code}</p>
            <div className="mt-2 sm:flex sm:justify-end">
              <PaymentStatusBadge status={payment.status} />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-50 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {term?.label ?? "Pembayaran project"}
              </p>
              <p className="text-xs text-zinc-500">
                Metode: {payment.method ?? "—"}
              </p>
            </div>
            <p className="text-xl font-semibold tracking-tight">
              {formatMoney(payment.amount, payment.currency)}
            </p>
          </div>
          {payment.note ? (
            <p className="mt-3 border-t border-zinc-200 pt-3 text-xs text-zinc-600">
              {payment.note}
            </p>
          ) : null}
        </div>

        <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Nilai project</span>
            <span>{formatMoney(project.totalAmount, project.currency)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Total dibayar</span>
            <span>{formatMoney(totalPaid, project.currency)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Sisa tagihan</span>
            <span>{formatMoney(remaining, project.currency)}</span>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4 border-t pt-4 text-xs text-zinc-500">
          <p>
            Diterbitkan {formatDateTime(payment.createdAt)}
            <br />
            Terima kasih atas kepercayaan Anda.
          </p>
          <p className="text-right">
            {owner.name}
            <br />
            Freelancer
          </p>
        </div>
      </div>
    </div>
  );
}
