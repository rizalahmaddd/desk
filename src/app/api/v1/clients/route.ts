import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getClientsForOwner } from "@/lib/queries";
import { createOrRestoreClient } from "@/lib/clients";
import { clientSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("query") || searchParams.get("search") || undefined;

  const db = await getDb();
  const clientList = await getClientsForOwner(db, auth.user.id, { query: search });

  return jsonResponse({
    success: true,
    count: clientList.length,
    clients: clientList,
  });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BadRequest", "Format payload JSON tidak valid.", 400);
  }

  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("ValidationError", "Data client tidak valid.", 422, parsed.error.flatten());
  }

  const db = await getDb();
  const result = await createOrRestoreClient(db, auth.user.id, parsed.data);
  if ("error" in result) return jsonError("Conflict", result.error, 409);
  const newClient = result.client;

  return jsonResponse(
    {
      success: true,
      message: "Customer berhasil dibuat.",
      client: newClient,
    },
    201,
  );
}
