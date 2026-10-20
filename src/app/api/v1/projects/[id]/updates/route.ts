import { and, eq, isNull, or } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getUpdates } from "@/lib/queries";
import { projects, updates } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { logActivity } from "@/lib/activity";
import { notifyClients } from "@/lib/notify";

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

  const updateList = await getUpdates(db, project.id, true);
  return jsonResponse({
    success: true,
    projectId: project.id,
    count: updateList.length,
    updates: updateList,
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

  const title = String(body.title || "").trim();
  if (title.length < 2 || title.length > 160) {
    return jsonError("ValidationError", "Judul update harus 2-160 karakter.", 422);
  }

  const db = await getDb();
  const project = await findProject(db, auth.user.id, id);
  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const updateId = newId();
  const visibility: "client" | "internal" = body.visibility === "internal" ? "internal" : "client";
  const updateContent = typeof body.body === "string" ? body.body.trim().slice(0, 10_000) || null : null;

  const newUpdate = {
    id: updateId,
    projectId: project.id,
    title,
    body: updateContent,
    visibility,
    authorId: auth.user.id,
    createdAt: new Date(),
  };

  await db.insert(updates).values(newUpdate);

  await logActivity(db, {
    projectId: project.id,
    actorType: "owner",
    actorId: auth.user.id,
    action: "update.created",
    metadata: { title, updateId, via: "api" },
  });

  if (visibility === "client") {
    await notifyClients(db, project.id, {
      type: "update.created",
      title: "Update project baru",
      message: title,
    });
  }

  return jsonResponse(
    {
      success: true,
      message: "Update progress berhasil diposting.",
      update: newUpdate,
    },
    201,
  );
}
