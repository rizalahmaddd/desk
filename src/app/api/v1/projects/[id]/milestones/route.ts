import { and, eq, isNull, or } from "drizzle-orm";
import { authenticateApiRequest, jsonError, jsonResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getMilestones } from "@/lib/queries";
import { milestones, projects } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { recalcProjectProgress } from "@/lib/progress";
import { logActivity } from "@/lib/activity";
import { isIsoDate } from "@/lib/validation";

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

  const milestoneList = await getMilestones(db, project.id);
  return jsonResponse({
    success: true,
    projectId: project.id,
    count: milestoneList.length,
    milestones: milestoneList,
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
  if (!title || title.length < 2) {
    return jsonError("ValidationError", "Judul milestone minimal 2 karakter.", 422);
  }

  const db = await getDb();
  const project = await findProject(db, auth.user.id, id);
  if (!project) {
    return jsonError("NotFound", "Project tidak ditemukan.", 404);
  }

  const status = (["not_started", "in_progress", "done", "blocked"].includes(
    String(body.status),
  )
    ? String(body.status)
    : "not_started") as "not_started" | "in_progress" | "done" | "blocked";

  const weight =
    typeof body.weight === "number" && body.weight >= 1
      ? Math.min(100, Math.round(body.weight))
      : 1;

  const milestoneId = newId();
  const position = typeof body.position === "number" ? body.position : 0;
  if (body.dueDate != null && body.dueDate !== "" && !isIsoDate(body.dueDate)) {
    return jsonError("ValidationError", "dueDate harus berformat YYYY-MM-DD.", 422);
  }
  const dueDate = isIsoDate(body.dueDate) ? body.dueDate : null;
  const description = typeof body.description === "string" ? body.description.trim() : null;

  const newMilestone = {
    id: milestoneId,
    projectId: project.id,
    title,
    description,
    status,
    weight,
    position,
    dueDate,
    completedAt: status === "done" ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(milestones).values(newMilestone);
  await recalcProjectProgress(db, project.id);

  await logActivity(db, {
    projectId: project.id,
    actorType: "owner",
    actorId: auth.user.id,
    action: "milestone.created",
    metadata: { title, weight, via: "api" },
  });

  return jsonResponse(
    {
      success: true,
      message: "Milestone berhasil ditambahkan.",
      milestone: newMilestone,
    },
    201,
  );
}
