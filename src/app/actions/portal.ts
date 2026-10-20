"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import {
  attachments,
  comments,
  notifications,
  payments,
} from "@/lib/db/schema";
import { newId, newInvoiceNo } from "@/lib/ids";
import { MAX_FILES_PER_MESSAGE } from "@/lib/constants";
import { parseMoneyInput } from "@/lib/money";
import { commentSchema, paymentClaimSchema } from "@/lib/validation";
import { firstError, formValues, field, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { notifyOwner } from "@/lib/notify";
import { isProjectAttachment } from "@/lib/queries";
import { resolveReplyParent } from "@/lib/comments";

export async function createPortalCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireShare();
  if (context.access.scope !== "comment") {
    return { error: "Anda hanya memiliki akses melihat." };
  }

  const parsed = commentSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const attachmentIds = formData
    .getAll("attachmentIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (attachmentIds.length > MAX_FILES_PER_MESSAGE) {
    return { error: `Maksimal ${MAX_FILES_PER_MESSAGE} lampiran per komentar.` };
  }

  const db = await getDb();
  const commentId = newId();
  const authorId = context.access.clientId ?? context.access.id;

  let parentId: string | null = null;
  if (parsed.data.parentId) {
    const reply = await resolveReplyParent(db, context.project.id, parsed.data.parentId, "client");
    if ("error" in reply) return { error: reply.error };
    parentId = reply.parent.id;
  }

  await db.insert(comments).values({
    id: commentId,
    projectId: context.project.id,
    entityType: "project",
    parentId,
    authorType: "client",
    authorId,
    body: parsed.data.body,
    visibility: "client",
  });

  for (const attachmentId of attachmentIds) {
    await db
      .update(attachments)
      .set({ entityType: "comment", entityId: commentId })
      .where(
        and(
          eq(attachments.id, attachmentId),
          eq(attachments.projectId, context.project.id),
          eq(attachments.uploadedByType, "client"),
          eq(attachments.uploadedById, authorId),
        ),
      );
  }

  await logActivity(db, {
    projectId: context.project.id,
    actorType: "client",
    actorId: authorId,
    action: "comment.created",
    metadata: { commentId },
  });

  await notifyOwner(db, context.project.ownerId, context.project.id, {
    type: "client.comment",
    title: parentId ? "Balasan baru dari client" : "Komentar baru dari client",
    message: parsed.data.body.slice(0, 160),
  });

  revalidatePath("/portal");
  revalidatePath("/portal/comments");
  return { success: "Komentar terkirim." };
}

export async function submitPaymentClaimAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const context = await requireShare();
  if (!context.access.canViewFinancials) {
    return { error: "Anda tidak memiliki akses ke data pembayaran." };
  }
  if (context.access.scope !== "comment") {
    return { error: "Anda hanya memiliki akses melihat." };
  }

  const parsed = paymentClaimSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const amount = parseMoneyInput(parsed.data.amount, context.project.currency);
  if (amount <= 0) return { error: "Nominal pembayaran harus lebih dari 0." };

  const db = await getDb();
  const paymentId = newId();
  const authorId = context.access.clientId ?? context.access.id;
  const requestedProof = field(formData, "proofAttachmentId");
  const proofAttachmentId =
    requestedProof &&
    (await isProjectAttachment(db, context.project.id, requestedProof, {
      type: "client",
      id: authorId,
    }))
      ? requestedProof
      : null;

  await db.insert(payments).values({
    id: paymentId,
    projectId: context.project.id,
    invoiceNo: newInvoiceNo(context.project.currency),
    amount,
    currency: context.project.currency,
    method: parsed.data.method || null,
    status: "pending",
    paidAt: parsed.data.paidAt,
    note: parsed.data.note || null,
    proofAttachmentId,
    submittedBy: "client",
  });

  if (proofAttachmentId) {
    await db
      .update(attachments)
      .set({ entityType: "payment", entityId: paymentId })
      .where(
        and(
          eq(attachments.id, proofAttachmentId),
          eq(attachments.projectId, context.project.id),
          eq(attachments.uploadedByType, "client"),
          eq(attachments.uploadedById, authorId),
        ),
      );
  }

  await logActivity(db, {
    projectId: context.project.id,
    actorType: "client",
    actorId: authorId,
    action: "payment.claim_submitted",
    metadata: { paymentId, amount },
  });

  await notifyOwner(db, context.project.ownerId, context.project.id, {
    type: "payment.claim",
    title: "Klaim pembayaran baru",
    message: "Client mengirim klaim pembayaran. Buka project untuk memverifikasi.",
  });

  revalidatePath("/portal");
  revalidatePath("/portal/payments");
  return { success: "Klaim pembayaran dikirim dan menunggu verifikasi." };
}

export async function markClientNotificationsReadAction(): Promise<ActionState> {
  const context = await requireShare();
  const recipientId = context.access.clientId ?? context.access.id;
  const db = await getDb();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientType, "client"),
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
        sql`json_extract(${notifications.payload}, '$.projectId') = ${context.project.id}`,
      ),
    );

  revalidatePath("/portal");
  revalidatePath("/portal/notifications");
  return { success: "Notifikasi ditandai terbaca." };
}
