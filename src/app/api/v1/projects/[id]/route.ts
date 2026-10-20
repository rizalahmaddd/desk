import { and, eq, isNull, or } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import {
  getMilestones,
  getPayments,
  getProjectSummary,
  getTermsWithTotals,
  getUpdates,
  hasMoneyRecords,
} from "@/lib/queries";
import { findOwnedClientId } from "@/lib/clients";
import { PROJECT_STATUSES, SUPPORTED_CURRENCIES } from "@/lib/constants";
import { recalcProjectProgress } from "@/lib/progress";
import { isIsoDate, isSupportedCurrency } from "@/lib/validation";
import { clients, projects } from "@/lib/db/schema";
import { parseMoneyInput } from "@/lib/money";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function findProject(
  db: Awaited<ReturnType<typeof getDb>>,
  ownerId: string,
  identifier: string,
) {
  const [row] = await db
    .select({ project: projects, client: clients })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        or(eq(projects.id, identifier), eq(projects.code, identifier.toUpperCase())),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id } = await params;
  const db = await getDb();
  const found = await findProject(db, auth.user.id, id);

  if (!found) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const projectId = found.project.id;
  const [summary, milestoneList, terms, paymentList, updateList] = await Promise.all([
    getProjectSummary(db, projectId),
    getMilestones(db, projectId),
    getTermsWithTotals(db, projectId),
    getPayments(db, projectId),
    getUpdates(db, projectId, true),
  ]);

  return jsonResponse({
    success: true,
    project: {
      ...found.project,
      client: found.client,
      financialSummary: {
        totalAmount: found.project.totalAmount,
        paidAmount: summary.paid,
        pendingAmount: Math.max(0, found.project.totalAmount - summary.paid),
        currency: found.project.currency,
        verifiedPaymentsCount: summary.verifiedCount,
        pendingPaymentsCount: summary.pendingCount,
      },
      milestones: milestoneList,
      paymentTerms: terms,
      payments: paymentList,
      updates: updateList,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("BadRequest", "Format payload JSON tidak valid.", 400);
  }

  const db = await getDb();
  const found = await findProject(db, auth.user.id, id);
  if (!found) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const projectId = found.project.id;
  const updatesToApply: Partial<typeof projects.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    updatesToApply.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.description === "string") {
    updatesToApply.description = body.description.trim().slice(0, 4000) || null;
  }
  if (typeof body.status === "string" && (PROJECT_STATUSES as readonly string[]).includes(body.status)) {
    updatesToApply.status = body.status as (typeof PROJECT_STATUSES)[number];
  }
  if (typeof body.currency === "string") {
    const currency = body.currency.toUpperCase();
    if (!isSupportedCurrency(currency)) {
      return jsonError("ValidationError", `Mata uang harus salah satu dari ${SUPPORTED_CURRENCIES.join(", ")}.`, 422);
    }
    if (currency !== found.project.currency && (await hasMoneyRecords(db, projectId))) {
      return jsonError(
        "Conflict",
        "Mata uang tidak dapat diubah karena sudah ada termin atau pembayaran.",
        409,
      );
    }
    updatesToApply.currency = currency;
  }
  if (body.totalAmount != null) {
    const curr = updatesToApply.currency || found.project.currency;
    updatesToApply.totalAmount = Math.max(0, parseMoneyInput(String(body.totalAmount), curr));
  }
  for (const key of ["startDate", "dueDate"] as const) {
    if (typeof body[key] !== "string") continue;
    if (body[key] && !isIsoDate(body[key])) {
      return jsonError("ValidationError", `${key} harus berformat YYYY-MM-DD.`, 422);
    }
    updatesToApply[key] = (body[key] as string) || null;
  }
  const startDate = updatesToApply.startDate !== undefined ? updatesToApply.startDate : found.project.startDate;
  const dueDate = updatesToApply.dueDate !== undefined ? updatesToApply.dueDate : found.project.dueDate;
  if (startDate && dueDate && dueDate < startDate) {
    return jsonError("ValidationError", "Deadline tidak boleh sebelum tanggal mulai.", 422);
  }
  if (body.progressMode === "auto" || body.progressMode === "manual") {
    updatesToApply.progressMode = body.progressMode;
  }
  const progressMode = updatesToApply.progressMode ?? found.project.progressMode;
  if (typeof body.progressPercent === "number" && progressMode === "manual") {
    updatesToApply.progressPercent = Math.max(0, Math.min(100, Math.round(body.progressPercent)));
  }
  if (typeof body.shareFinancials === "boolean") {
    updatesToApply.shareFinancials = body.shareFinancials;
  }
  if (typeof body.clientId === "string") {
    if (body.clientId.trim()) {
      const clientId = await findOwnedClientId(db, auth.user.id, body.clientId.trim());
      if (!clientId) return jsonError("NotFound", "Customer tidak ditemukan.", 404);
      updatesToApply.clientId = clientId;
    } else {
      updatesToApply.clientId = null;
    }
  }
  updatesToApply.version = found.project.version + 1;

  await db
    .update(projects)
    .set(updatesToApply)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, auth.user.id)));

  if (progressMode === "auto" && found.project.progressMode !== "auto") {
    await recalcProjectProgress(db, projectId);
  }

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: auth.user.id,
    action: "project.updated",
    metadata: { fields: Object.keys(updatesToApply), via: "api" },
  });

  return jsonResponse({
    success: true,
    message: "Project berhasil diperbarui.",
    updatedFields: Object.keys(updatesToApply).filter((k) => k !== "updatedAt"),
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id } = await params;
  const db = await getDb();
  const found = await findProject(db, auth.user.id, id);
  if (!found) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const projectId = found.project.id;
  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, auth.user.id)));

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: auth.user.id,
    action: "project.deleted",
    metadata: { name: found.project.name, via: "api" },
  });

  return jsonResponse({
    success: true,
    message: "Project berhasil dihapus.",
  });
}
