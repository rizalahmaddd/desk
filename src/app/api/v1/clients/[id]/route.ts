import { and, eq } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getClientForOwner } from "@/lib/queries";
import { clients } from "@/lib/db/schema";
import { deleteClientRecord, updateClientRecord } from "@/lib/clients";
import { clientSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id } = await params;
  const db = await getDb();
  const result = await getClientForOwner(db, auth.user.id, id);

  if (!result) {
    return jsonError("NotFound", "Customer tidak ditemukan.", 404);
  }

  return jsonResponse({
    success: true,
    ...result,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BadRequest", "Format payload JSON tidak valid.", 400);
  }

  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return jsonError("ValidationError", "Data update customer tidak valid.", 422, parsed.error.flatten());
  }

  const db = await getDb();
  // Partial schemas still fill defaults, so only apply fields the caller actually sent.
  const sent = body as Record<string, unknown>;
  const fields = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => key in sent),
  );
  const result = await updateClientRecord(db, auth.user.id, id, fields);
  if ("error" in result) {
    const notFound = result.error === "Customer tidak ditemukan.";
    return jsonError(notFound ? "NotFound" : "Conflict", result.error, notFound ? 404 : 409);
  }

  return jsonResponse({
    success: true,
    message: "Data customer berhasil diperbarui.",
    client: result.client,
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id } = await params;
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.ownerId, auth.user.id)))
    .limit(1);

  if (!existing || existing.deletedAt) {
    return jsonError("NotFound", "Customer tidak ditemukan.", 404);
  }

  await deleteClientRecord(db, id);

  return jsonResponse({
    success: true,
    message: "Customer berhasil dihapus.",
  });
}
