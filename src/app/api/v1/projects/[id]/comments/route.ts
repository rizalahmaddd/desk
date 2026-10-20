import { and, eq, isNull, or } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getCommentsWithAuthors } from "@/lib/queries";
import { comments, projects } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { logActivity } from "@/lib/activity";
import { notifyClients } from "@/lib/notify";
import { resolveReplyParent } from "@/lib/comments";

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

  const commentList = await getCommentsWithAuthors(db, project.id, true);
  return jsonResponse({
    success: true,
    projectId: project.id,
    count: commentList.length,
    comments: commentList,
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

  const text = String(body.body || "").trim();
  if (!text || text.length > 5000) {
    return jsonError("ValidationError", "Isi komentar wajib diisi, maksimal 5000 karakter.", 422);
  }

  const db = await getDb();
  const project = await findProject(db, auth.user.id, id);
  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const commentId = newId();
  const entityType = (["project", "milestone", "update", "payment"].includes(
    String(body.entityType),
  )
    ? String(body.entityType)
    : "project") as "project" | "milestone" | "update" | "payment";
  const entityId = typeof body.entityId === "string" ? body.entityId.trim() : null;
  let visibility: "client" | "internal" = body.visibility === "internal" ? "internal" : "client";
  let parentId: string | null = null;
  if (typeof body.parentId === "string" && body.parentId.trim()) {
    const reply = await resolveReplyParent(db, project.id, body.parentId.trim(), "owner");
    if ("error" in reply) return jsonError("NotFound", reply.error, 404);
    parentId = reply.parent.id;
    if (reply.parent.visibility === "internal") visibility = "internal";
  }

  const newComment = {
    id: commentId,
    projectId: project.id,
    entityType,
    entityId,
    parentId,
    authorType: "owner" as const,
    authorId: auth.user.id,
    body: text,
    visibility,
    createdAt: new Date(),
  };

  await db.insert(comments).values(newComment);

  await logActivity(db, {
    projectId: project.id,
    actorType: "owner",
    actorId: auth.user.id,
    action: "comment.created",
    metadata: { commentId, via: "api" },
  });

  if (visibility === "client") {
    await notifyClients(db, project.id, {
      type: "comment.created",
      title: "Komentar baru dari freelancer",
      message: text.slice(0, 160),
    });
  }

  return jsonResponse(
    {
      success: true,
      message: "Komentar berhasil ditambahkan.",
      comment: newComment,
    },
    201,
  );
}
