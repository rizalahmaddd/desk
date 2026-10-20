import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getProjectsForOwner } from "@/lib/queries";
import { projects } from "@/lib/db/schema";
import { findOwnedClientId, resolveClientForProject } from "@/lib/clients";
import { PROJECT_STATUSES, SUPPORTED_CURRENCIES } from "@/lib/constants";
import { isIsoDate, isSupportedCurrency } from "@/lib/validation";
import { newId, newProjectCode } from "@/lib/ids";
import { parseMoneyInput } from "@/lib/money";
import { logActivity } from "@/lib/activity";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const clientId = searchParams.get("clientId") || undefined;
  const search = searchParams.get("search") || searchParams.get("query") || undefined;
  const archived = searchParams.get("archived") === "true";

  const db = await getDb();
  const projectList = await getProjectsForOwner(db, auth.user.id, {
    status,
    clientId,
    query: search,
    archived,
  });

  return jsonResponse({
    success: true,
    count: projectList.length,
    projects: projectList,
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("BadRequest", "Format payload JSON tidak valid.", 400);
  }

  const name = String(body.name || "").trim();
  if (!name || name.length < 2) {
    return jsonError("ValidationError", "Nama project minimal 2 karakter.", 422);
  }

  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "IDR";
  if (!isSupportedCurrency(currency)) {
    return jsonError("ValidationError", `Mata uang harus salah satu dari ${SUPPORTED_CURRENCIES.join(", ")}.`, 422);
  }

  for (const key of ["startDate", "dueDate"] as const) {
    if (body[key] != null && body[key] !== "" && !isIsoDate(body[key])) {
      return jsonError("ValidationError", `${key} harus berformat YYYY-MM-DD.`, 422);
    }
  }
  const startDate = isIsoDate(body.startDate) ? body.startDate : null;
  const dueDate = isIsoDate(body.dueDate) ? body.dueDate : null;
  if (startDate && dueDate && dueDate < startDate) {
    return jsonError("ValidationError", "Deadline tidak boleh sebelum tanggal mulai.", 422);
  }

  const db = await getDb();

  let code = newProjectCode();
  if (typeof body.code === "string" && body.code.trim()) {
    code = body.code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,32}$/.test(code)) {
      return jsonError("ValidationError", "Kode project hanya boleh huruf, angka, dan tanda hubung (2-32 karakter).", 422);
    }
    const [taken] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.ownerId, auth.user.id), eq(projects.code, code)))
      .limit(1);
    if (taken) return jsonError("Conflict", "Kode project sudah dipakai.", 409);
  }

  let clientId: string | null = null;
  if (typeof body.clientId === "string" && body.clientId.trim()) {
    clientId = await findOwnedClientId(db, auth.user.id, body.clientId.trim());
    if (!clientId) return jsonError("NotFound", "Customer tidak ditemukan.", 404);
  } else {
    const client = await resolveClientForProject(db, auth.user.id, {
      name: typeof body.clientName === "string" ? body.clientName : "",
      email: typeof body.clientEmail === "string" ? body.clientEmail : "",
      company: typeof body.clientCompany === "string" ? body.clientCompany : "",
    });
    clientId = client?.id ?? null;
  }

  const projectId = newId();
  const rawAmount = body.totalAmount != null ? String(body.totalAmount) : "0";
  const totalAmount = Math.max(0, parseMoneyInput(rawAmount, currency));
  const status = (PROJECT_STATUSES as readonly string[]).includes(String(body.status))
    ? (String(body.status) as (typeof PROJECT_STATUSES)[number])
    : "active";

  const progressMode: "auto" | "manual" = body.progressMode === "manual" ? "manual" : "auto";
  const progressPercent =
    progressMode === "manual" && typeof body.progressPercent === "number"
      ? Math.max(0, Math.min(100, Math.round(body.progressPercent)))
      : 0;

  const newProject = {
    id: projectId,
    ownerId: auth.user.id,
    clientId,
    code,
    name: name.slice(0, 120),
    description: typeof body.description === "string" ? body.description.trim().slice(0, 4000) || null : null,
    status,
    currency,
    totalAmount,
    progressMode,
    progressPercent,
    startDate,
    dueDate,
    shareFinancials: body.shareFinancials !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(projects).values(newProject);

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: auth.user.id,
    action: "project.created",
    metadata: { name, code, via: "api" },
  });

  return jsonResponse(
    {
      success: true,
      message: "Project berhasil dibuat.",
      project: newProject,
    },
    201,
  );
}
