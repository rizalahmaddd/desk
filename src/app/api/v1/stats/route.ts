import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const db = await getDb();
  const data = await getDashboardData(db, auth.user.id);

  return jsonResponse({
    success: true,
    stats: {
      activeProjectsCount: data.stats.activeProjects,
      totalProjectsCount: data.stats.totalProjects,
      totalContractValue: data.stats.totalValue,
      totalPaidAmount: data.stats.totalPaid,
      totalPendingAmount: data.stats.remaining,
      pendingClaimsAmount: data.stats.pendingClaims,
      currency: "IDR",
    },
    recentProjects: data.projects.slice(0, 5).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      progressPercent: p.progressPercent,
      totalAmount: p.totalAmount,
      paid: p.paid,
      dueDate: p.dueDate,
      clientName: p.client?.name ?? null,
    })),
  });
}
