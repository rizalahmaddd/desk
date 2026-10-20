import {
  AlertTriangle,
  CircleCheckBig,
  Clock3,
  Wallet,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PaymentsManager } from "@/components/payments-manager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireOwner } from "@/lib/session";
import { getCloudflareEnv, getDb } from "@/lib/db";
import {
  getPayments,
  getProjectAccessList,
  getProjectForOwner,
  getProjectSummary,
  getTermsWithTotals,
} from "@/lib/queries";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);
  if (!row) return null;

  const [summary, terms, payments, accesses] = await Promise.all([
    getProjectSummary(db, id),
    getTermsWithTotals(db, id),
    getPayments(db, id),
    getProjectAccessList(db, id),
  ]);

  const { project, client } = row;
  const remaining = Math.max(project.totalAmount - summary.paid, 0);

  const activeAccess = accesses.find((a) => !a.access.revokedAt && a.access.token);
  const { APP_URL } = await getCloudflareEnv();
  const portalUrl = activeAccess?.access.token
    ? `${APP_URL}/s/${activeAccess.access.token}`
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Nilai Project"
          value={formatMoney(project.totalAmount, project.currency)}
          icon={WalletCards}
        />
        <StatCard
          label="Sudah Dibayar"
          value={formatMoney(summary.paid, project.currency)}
          icon={CircleCheckBig}
          tone="success"
        />
        <StatCard
          label="Sisa Tagihan"
          value={formatMoney(remaining, project.currency)}
          icon={Wallet}
          tone={remaining > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={formatMoney(summary.pending, project.currency)}
          hint={`${summary.pendingCount} klaim`}
          icon={Clock3}
          tone={summary.pendingCount > 0 ? "warning" : "default"}
        />
      </div>

      {summary.paid > project.totalAmount ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Pembayaran terverifikasi melebihi nilai project sebesar{" "}
            {formatMoney(
              summary.paid - project.totalAmount,
              project.currency,
            )}
            . Tinjau kembali nominal atau catat sebagai kredit/refund.
          </AlertDescription>
        </Alert>
      ) : null}

      <PaymentsManager
        projectId={id}
        currency={project.currency}
        projectName={project.name}
        clientName={client?.name}
        clientPhone={client?.phone}
        portalUrl={portalUrl}
        terms={terms}
        payments={payments}
      />
    </div>
  );
}
