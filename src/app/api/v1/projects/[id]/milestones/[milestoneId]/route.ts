import { and, eq, isNull, or } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { milestones, projects } from "@/lib/db/schema";
import { recalcProjectProgress } from "@/lib/progress";
import { logActivity } from "@/lib/activity";
import { isIsoDate } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string; milestoneId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id, milestoneId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("BadRequest", "Format payload JSON tidak valid.", 400);
  }

  const db = await getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, auth.user.id),
        or(eq(projects.id, id), eq(projects.code, id.toUpperCase())),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const [existing] = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, project.id),
        isNull(milestones.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return jsonError("NotFound", "Milestone tidak ditemukan.", 404);
  }

  const updateData: Partial<typeof milestones.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof body.title === "string" && body.title.trim().length >= 2) {
    updateData.title = body.title.trim();
  }
  if (typeof body.description === "string") {
    updateData.description = body.description.trim() || null;
  }
  if (
    typeof body.status === "string" &&
    ["not_started", "in_progress", "done", "blocked"].includes(body.status)
  ) {
    updateData.status = body.status as "not_started" | "in_progress" | "done" | "blocked";
    if (body.status === "done" && existing.status !== "done") {
      updateData.completedAt = new Date();
    } else if (body.status !== "done") {
      updateData.completedAt = null;
    }
  }
  if (typeof body.weight === "number" && body.weight >= 1) {
    updateData.weight = Math.min(100, Math.round(body.weight));
  }
  if (typeof body.dueDate === "string") {
    if (body.dueDate && !isIsoDate(body.dueDate)) {
      return jsonError("ValidationError", "dueDate harus berformat YYYY-MM-DD.", 422);
    }
    updateData.dueDate = body.dueDate || null;
  }

  await db
    .update(milestones)
    .set(updateData)
    .where(eq(milestones.id, milestoneId));

  await recalcProjectProgress(db, project.id);

  await logActivity(db, {
    projectId: project.id,
    actorType: "owner",
    actorId: auth.user.id,
    action: "milestone.updated",
    metadata: { milestoneId, fields: Object.keys(updateData), via: "api" },
  });

  return jsonResponse({
    success: true,
    message: "Milestone berhasil diperbarui.",
    milestone: {
      ...existing,
      ...updateData,
    },
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return jsonError("Unauthorized", "API key tidak valid atau tidak ditemukan.", 401);
  }

  const { id, milestoneId } = await params;
  const db = await getDb();

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, auth.user.id),
        or(eq(projects.id, id), eq(projects.code, id.toUpperCase())),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const [existing] = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, project.id),
        isNull(milestones.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return jsonError("NotFound", "Milestone tidak ditemukan.", 404);
  }

  await db
    .update(milestones)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(milestones.id, milestoneId));

  await recalcProjectProgress(db, project.id);

  return jsonResponse({
    success: true,
    message: "Milestone berhasil dihapus.",
  });
}
