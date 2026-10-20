"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { attachments, comments, projects } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { MAX_FILES_PER_MESSAGE } from "@/lib/constants";
import { commentSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { notifyClients } from "@/lib/notify";
import { resolveReplyParent } from "@/lib/comments";

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

export async function createCommentAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = commentSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const attachmentIds = formData
    .getAll("attachmentIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (attachmentIds.length > MAX_FILES_PER_MESSAGE) {
    return { error: `Maksimal ${MAX_FILES_PER_MESSAGE} lampiran per komentar.` };
  }

  let parentId: string | null = null;
  let visibility = parsed.data.visibility;
  if (parsed.data.parentId) {
    const reply = await resolveReplyParent(db, projectId, parsed.data.parentId, "owner");
    if ("error" in reply) return { error: reply.error };
    parentId = reply.parent.id;
    // A reply inside an internal thread must never become visible to the client.
    if (reply.parent.visibility === "internal") visibility = "internal";
  }

  const commentId = newId();
  await db.insert(comments).values({
    id: commentId,
    projectId,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId || null,
    parentId,
    authorType: "owner",
    authorId: session.user.id,
    body: parsed.data.body,
    visibility,
  });

  if (attachmentIds.length > 0) {
    for (const attachmentId of attachmentIds) {
      await db
        .update(attachments)
        .set({ entityType: "comment", entityId: commentId })
        .where(
          and(
            eq(attachments.id, attachmentId),
            eq(attachments.projectId, projectId),
          ),
        );
    }
  }

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "comment.created",
    metadata: { commentId, visibility, parentId },
  });

  if (visibility === "client") {
    await notifyClients(db, projectId, {
      type: "comment.created",
      title: parentId ? "Balasan baru dari freelancer" : "Komentar baru dari freelancer",
      message: parsed.data.body.slice(0, 160),
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/comments`);
  return { success: "Komentar dikirim." };
}

export async function deleteCommentAction(
  projectId: string,
  commentId: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(comments.id, commentId), eq(comments.projectId, projectId)),
    );

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "comment.deleted",
    metadata: { commentId },
  });

  revalidatePath(`/projects/${projectId}/comments`);
  return { success: "Komentar dihapus." };
}
