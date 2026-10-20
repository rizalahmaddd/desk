"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import {
  attachments,
  paymentTerms,
  payments,
  projects,
} from "@/lib/db/schema";
import { newId, newInvoiceNo } from "@/lib/ids";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import {
  paymentDecisionSchema,
  paymentSchema,
  paymentTermSchema,
} from "@/lib/validation";
import { firstError, formValues, field, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { notifyClients } from "@/lib/notify";
import { isProjectAttachment, isProjectTerm } from "@/lib/queries";

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

export async function createTermAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = paymentTermSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const amount = parseMoneyInput(parsed.data.amount, project.currency);
  if (amount <= 0) return { error: "Nominal termin harus lebih dari 0." };

  const [positionRow] = await db
    .select({ max: sql<number>`coalesce(max(${paymentTerms.position}), -1)` })
    .from(paymentTerms)
    .where(eq(paymentTerms.projectId, projectId));

  await db.insert(paymentTerms).values({
    id: newId(),
    projectId,
    label: parsed.data.label,
    amount,
    dueDate: parsed.data.dueDate || null,
    position: Number(positionRow?.max ?? -1) + 1,
  });

  revalidatePath(`/projects/${projectId}/payments`);
  return { success: "Termin pembayaran ditambahkan." };
}

export async function deleteTermAction(
  projectId: string,
  termId: string,
): Promise<ActionState> {
  const { db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  await db
    .delete(paymentTerms)
    .where(
      and(eq(paymentTerms.id, termId), eq(paymentTerms.projectId, projectId)),
    );

  revalidatePath(`/projects/${projectId}/payments`);
  return { success: "Termin dihapus. Pembayaran terkait tetap tersimpan." };
}

export async function createPaymentAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = paymentSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const amount = parseMoneyInput(parsed.data.amount, project.currency);
  if (amount <= 0) return { error: "Nominal pembayaran harus lebih dari 0." };

  const termId = parsed.data.termId || null;
  if (termId && !(await isProjectTerm(db, projectId, termId))) {
    return { error: "Termin pembayaran tidak ditemukan." };
  }

  const paymentId = newId();
  const status = parsed.data.status;
  const requestedProof = field(formData, "proofAttachmentId");
  const proofAttachmentId =
    requestedProof && (await isProjectAttachment(db, projectId, requestedProof))
      ? requestedProof
      : null;

  await db.insert(payments).values({
    id: paymentId,
    projectId,
    termId,
    invoiceNo: newInvoiceNo(project.currency),
    amount,
    currency: project.currency,
    method: parsed.data.method || null,
    status,
    paidAt: parsed.data.paidAt,
    note: parsed.data.note || null,
    proofAttachmentId,
    submittedBy: "owner",
    verifiedBy: status === "verified" ? session.user.id : null,
    verifiedAt: status === "verified" ? new Date() : null,
  });

  if (proofAttachmentId) {
    await db
      .update(attachments)
      .set({ entityType: "payment", entityId: paymentId })
      .where(
        and(
          eq(attachments.id, proofAttachmentId),
          eq(attachments.projectId, projectId),
        ),
      );
  }

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: status === "verified" ? "payment.verified" : "payment.created",
    metadata: { amount, paymentId },
  });

  if (status === "verified") {
    await notifyClients(
      db,
      projectId,
      {
        type: "payment.verified",
        title: "Pembayaran terverifikasi",
        message: `Pembayaran sebesar ${formatMoney(amount, project.currency)} telah diverifikasi oleh freelancer.`,
      },
      { requireFinancials: true },
    );
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/payments`);
  return { success: "Pembayaran dicatat." };
}

export async function decidePaymentAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = paymentDecisionSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, parsed.data.paymentId),
        eq(payments.projectId, projectId),
        isNull(payments.deletedAt),
      ),
    )
    .limit(1);

  if (!payment) return { error: "Pembayaran tidak ditemukan." };
  if (payment.status !== "pending") {
    return { error: "Hanya pembayaran berstatus menunggu yang dapat diputuskan." };
  }

  if (parsed.data.decision === "reject" && !parsed.data.reason) {
    return { error: "Alasan penolakan wajib diisi." };
  }

  const verified = parsed.data.decision === "verify";

  const result = await db
    .update(payments)
    .set({
      status: verified ? "verified" : "rejected",
      verifiedBy: session.user.id,
      verifiedAt: new Date(),
      rejectedReason: verified ? null : parsed.data.reason,
    })
    .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
  if (result.meta.changes === 0) {
    return { error: "Pembayaran ini sudah diputuskan sebelumnya." };
  }

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: verified ? "payment.verified" : "payment.rejected",
    metadata: { paymentId: payment.id, amount: payment.amount },
  });

  await notifyClients(
    db,
    projectId,
    {
      type: verified ? "payment.verified" : "payment.rejected",
      title: verified ? "Pembayaran terverifikasi" : "Klaim pembayaran ditolak",
      message: verified
        ? "Klaim pembayaran Anda telah diverifikasi."
        : `Klaim pembayaran ditolak. ${parsed.data.reason ?? ""}`.trim(),
    },
    { requireFinancials: true },
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/payments`);
  return {
    success: verified ? "Pembayaran diverifikasi." : "Klaim pembayaran ditolak.",
  };
}

export async function deletePaymentAction(
  projectId: string,
  paymentId: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.projectId, projectId),
        isNull(payments.deletedAt),
      ),
    )
    .limit(1);

  if (!payment) return { error: "Pembayaran tidak ditemukan." };

  await db
    .update(payments)
    .set({ deletedAt: new Date() })
    .where(eq(payments.id, paymentId));

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "payment.deleted",
    metadata: { paymentId, amount: payment.amount },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/payments`);
  return { success: "Pembayaran dibatalkan." };
}
