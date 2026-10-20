"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { milestones, projects } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { milestoneSchema, milestoneStatusSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { recalcProjectProgress } from "@/lib/progress";

async function ownProject(projectId: string) {
  const session = await requireOwner();
  const db = await getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.ownerId, session.user.id),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);
  return { session, db, project };
}

function completedAtFor(
  status: string,
  existing: { status: string; completedAt: Date | null },
) {
  if (status !== "done") return null;
  return existing.status === "done" && existing.completedAt ? existing.completedAt : new Date();
}

export async function createMilestoneAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = milestoneSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  const [positionRow] = await db
    .select({ max: sql<number>`coalesce(max(${milestones.position}), -1)` })
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, projectId),
        isNull(milestones.deletedAt),
      ),
    );

  await db.insert(milestones).values({
    id: newId(),
    projectId,
    title: input.title,
    description: input.description || null,
    status: input.status,
    weight: input.weight,
    position: Number(positionRow?.max ?? -1) + 1,
    dueDate: input.dueDate || null,
    completedAt: input.status === "done" ? new Date() : null,
  });

  await recalcProjectProgress(db, projectId);
  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "milestone.created",
    metadata: { title: input.title },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones`);
  return { success: "Milestone ditambahkan." };
}

export async function updateMilestoneAction(
  projectId: string,
  milestoneId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = milestoneSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  const [existing] = await db
    .select({ status: milestones.status, completedAt: milestones.completedAt })
    .from(milestones)
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
        isNull(milestones.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Milestone tidak ditemukan." };

  await db
    .update(milestones)
    .set({
      title: input.title,
      description: input.description || null,
      status: input.status,
      weight: input.weight,
      dueDate: input.dueDate || null,
      completedAt: completedAtFor(input.status, existing),
    })
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
    );

  await recalcProjectProgress(db, projectId);
  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "milestone.updated",
    metadata: { title: input.title },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones`);
  return { success: "Milestone diperbarui." };
}

export async function setMilestoneStatusAction(
  projectId: string,
  milestoneId: string,
  status: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = milestoneStatusSchema.safeParse({ milestoneId, status });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const [existing] = await db
    .select({ status: milestones.status, completedAt: milestones.completedAt })
    .from(milestones)
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
        isNull(milestones.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Milestone tidak ditemukan." };

  await db
    .update(milestones)
    .set({
      status: parsed.data.status,
      completedAt: completedAtFor(parsed.data.status, existing),
    })
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
    );

  await recalcProjectProgress(db, projectId);
  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "milestone.status_changed",
    metadata: { milestoneId, status },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones`);
  return { success: "Status milestone diperbarui." };
}

export async function deleteMilestoneAction(
  projectId: string,
  milestoneId: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  await db
    .update(milestones)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
    );

  await recalcProjectProgress(db, projectId);
  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "milestone.deleted",
    metadata: { milestoneId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones`);
  return { success: "Milestone dihapus." };
}

export async function reorderMilestoneAction(
  projectId: string,
  milestoneId: string,
  direction: "up" | "down",
): Promise<ActionState> {
  const { db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const rows = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, projectId),
        isNull(milestones.deletedAt),
      ),
    )
    .orderBy(asc(milestones.position), asc(milestones.createdAt));

  const index = rows.findIndex((row) => row.id === milestoneId);
  if (index < 0) return { error: "Milestone tidak ditemukan." };

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  const neighbor = rows[neighborIndex];
  const current = rows[index];
  if (!neighbor) return null;

  await db
    .update(milestones)
    .set({ position: neighbor.position })
    .where(eq(milestones.id, current.id));
  await db
    .update(milestones)
    .set({ position: current.position })
    .where(eq(milestones.id, neighbor.id));

  revalidatePath(`/projects/${projectId}/milestones`);
  return null;
}
