import { and, eq, isNull, or, sql } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getTermsWithTotals } from "@/lib/queries";
import { paymentTerms, projects } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
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

  const terms = await getTermsWithTotals(db, project.id);
  return jsonResponse({
    success: true,
    projectId: project.id,
    terms,
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

  const label = String(body.label || "").trim();
  if (!label || label.length < 2) {
    return jsonError("ValidationError", "Label termin minimal 2 karakter.", 422);
  }

  const db = await getDb();
  const project = await findProject(db, auth.user.id, id);
  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const rawAmount = body.amount != null ? String(body.amount) : "0";
  const amount = parseMoneyInput(rawAmount, project.currency);
  if (amount <= 0) {
    return jsonError("ValidationError", "Nominal termin harus lebih dari 0.", 422);
  }

  const [positionRow] = await db
    .select({ max: sql<number>`coalesce(max(${paymentTerms.position}), -1)` })
    .from(paymentTerms)
    .where(eq(paymentTerms.projectId, project.id));

  const position =
    typeof body.position === "number"
      ? body.position
      : Number(positionRow?.max ?? -1) + 1;

  const dueDate =
    typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
      ? body.dueDate
      : null;

  const termId = newId();
  const newTerm = {
    id: termId,
    projectId: project.id,
    label,
    amount,
    dueDate,
    position,
    status: (["unpaid", "partial", "paid", "overdue"].includes(String(body.status))
      ? String(body.status)
      : "unpaid") as "unpaid" | "partial" | "paid" | "overdue",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(paymentTerms).values(newTerm);

  await logActivity(db, {
    projectId: project.id,
    actorType: "owner",
    actorId: auth.user.id,
    action: "payment_term.created",
    metadata: { label, amount, via: "api" },
  });

  return jsonResponse(
    {
      success: true,
      message: "Termin pembayaran berhasil ditambahkan.",
      term: newTerm,
    },
    201,
  );
}
