import { and, eq, isNull, or } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getPayments, getTermsWithTotals, isProjectTerm } from "@/lib/queries";
import { notifyClients } from "@/lib/notify";
import { payments, projects } from "@/lib/db/schema";
import { newId, newInvoiceNo } from "@/lib/ids";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import { logActivity } from "@/lib/activity";
import { todayISO } from "@/lib/dates";

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
    .select()
    .from(projects)
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
  const project = await findProject(db, auth.user.id, id);
  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const [paymentList, terms] = await Promise.all([
    getPayments(db, project.id),
    getTermsWithTotals(db, project.id),
  ]);

  return jsonResponse({
    success: true,
    projectId: project.id,
    terms,
    payments: paymentList,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
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
  const project = await findProject(db, auth.user.id, id);
  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const rawAmount = body.amount != null ? String(body.amount) : "0";
  const amount = parseMoneyInput(rawAmount, project.currency);
  if (amount <= 0) {
    return jsonError("ValidationError", "Nominal pembayaran harus lebih dari 0.", 422);
  }

  const paidAt =
    typeof body.paidAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidAt)
      ? body.paidAt
      : todayISO();

  const termId = typeof body.termId === "string" && body.termId.trim() ? body.termId.trim() : null;
  if (termId && !(await isProjectTerm(db, project.id, termId))) {
    return jsonError("NotFound", "Termin pembayaran tidak ditemukan di project ini.", 404);
  }

  const status: "pending" | "verified" = body.status === "pending" ? "pending" : "verified";
  const paymentId = newId();
  const invoiceNo =
    typeof body.invoiceNo === "string" && body.invoiceNo.trim()
      ? body.invoiceNo.trim().slice(0, 64)
      : newInvoiceNo(project.currency);

  const newPayment = {
    id: paymentId,
    projectId: project.id,
    termId,
    invoiceNo,
    amount,
    currency: project.currency,
    method: typeof body.method === "string" ? body.method.trim().slice(0, 80) : "Transfer Bank",
    status,
    paidAt,
    note: typeof body.note === "string" ? body.note.trim().slice(0, 1000) || null : null,
    submittedBy: "owner" as const,
    verifiedBy: status === "verified" ? auth.user.id : null,
    verifiedAt: status === "verified" ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(payments).values(newPayment);

  await logActivity(db, {
    projectId: project.id,
    actorType: "owner",
    actorId: auth.user.id,
    action: status === "verified" ? "payment.verified" : "payment.created",
    metadata: { amount, paymentId, invoiceNo, via: "api" },
  });

  if (status === "verified") {
    await notifyClients(
      db,
      project.id,
      {
        type: "payment.verified",
        title: "Pembayaran terverifikasi",
        message: `Pembayaran sebesar ${formatMoney(amount, project.currency)} telah diverifikasi oleh freelancer.`,
      },
      { requireFinancials: true },
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Pembayaran berhasil dicatat.",
      payment: newPayment,
    },
    201,
  );
}
