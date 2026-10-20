"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { attachments, projects, updates } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { MAX_FILES_PER_MESSAGE } from "@/lib/constants";
import { updateSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { notifyClients } from "@/lib/notify";

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

export async function createUpdateAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = updateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const attachmentIds = formData
    .getAll("attachmentIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (attachmentIds.length > MAX_FILES_PER_MESSAGE) {
    return { error: `Maksimal ${MAX_FILES_PER_MESSAGE} lampiran per update.` };
  }

  const updateId = newId();
  await db.insert(updates).values({
    id: updateId,
    projectId,
    title: parsed.data.title,
    body: parsed.data.body || null,
    visibility: parsed.data.visibility,
    authorId: session.user.id,
  });

  for (const attachmentId of attachmentIds) {
    await db
      .update(attachments)
      .set({ entityType: "update", entityId: updateId })
      .where(
        and(
          eq(attachments.id, attachmentId),
          eq(attachments.projectId, projectId),
        ),
      );
  }

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "update.created",
    metadata: { updateId, visibility: parsed.data.visibility },
  });

  if (parsed.data.visibility === "client") {
    await notifyClients(db, projectId, {
      type: "update.created",
      title: "Update project baru",
      message: parsed.data.title,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/portal");
  return { success: "Update dipublikasikan." };
}

export async function deleteUpdateAction(
  projectId: string,
  updateId: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  await db
    .update(updates)
    .set({ deletedAt: new Date() })
    .where(and(eq(updates.id, updateId), eq(updates.projectId, projectId)));

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "update.deleted",
    metadata: { updateId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/portal");
  return { success: "Update dihapus." };
}
