"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { milestones, paymentTerms, projects } from "@/lib/db/schema";
import { newId, newProjectCode } from "@/lib/ids";
import { findOwnedClientId, resolveClientForProject } from "@/lib/clients";
import { hasMoneyRecords } from "@/lib/queries";
import { recalcProjectProgress } from "@/lib/progress";
import { parseMoneyInput } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { projectSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";

async function resolveProjectClientId(
  db: Awaited<ReturnType<typeof getDb>>,
  ownerId: string,
  input: { clientId: string; clientName: string; clientEmail: string; clientCompany: string },
): Promise<{ clientId: string | null } | { error: string }> {
  const requested = input.clientId.trim();
  if (requested) {
    const clientId = await findOwnedClientId(db, ownerId, requested);
    return clientId ? { clientId } : { error: "Customer tidak ditemukan." };
  }
  const client = await resolveClientForProject(db, ownerId, {
    name: input.clientName,
    email: input.clientEmail,
    company: input.clientCompany,
  });
  return { clientId: client?.id ?? null };
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const parsed = projectSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const input = parsed.data;
  const db = await getDb();
  const resolved = await resolveProjectClientId(db, session.user.id, input);
  if ("error" in resolved) return { error: resolved.error };
  const { clientId } = resolved;

  const projectId = newId();
  await db.insert(projects).values({
    id: projectId,
    ownerId: session.user.id,
    clientId,
    code: newProjectCode(),
    name: input.name,
    description: input.description || null,
    status: input.status,
    currency: input.currency,
    totalAmount: parseMoneyInput(input.totalAmount, input.currency),
    progressMode: input.progressMode,
    progressPercent: input.progressMode === "manual" ? input.progressPercent : 0,
    startDate: input.startDate || null,
    dueDate: input.dueDate || null,
    shareFinancials: input.shareFinancials,
  });

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "project.created",
    metadata: { name: input.name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const parsed = projectSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const input = parsed.data;
  const db = await getDb();
  const [existing] = await db
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

  if (!existing) return { error: "Project tidak ditemukan." };

  if (input.currency !== existing.currency && (await hasMoneyRecords(db, projectId))) {
    return {
      error:
        "Mata uang tidak dapat diubah karena sudah ada termin atau pembayaran. Hapus termin dan batalkan pembayaran terlebih dahulu.",
    };
  }

  const resolved = await resolveProjectClientId(db, session.user.id, input);
  if ("error" in resolved) return { error: resolved.error };
  const { clientId } = resolved;

  const version = Number(formValues(formData).version ?? existing.version);

  const result = await db
    .update(projects)
    .set({
      clientId,
      name: input.name,
      description: input.description || null,
      status: input.status,
      currency: input.currency,
      totalAmount: parseMoneyInput(input.totalAmount, input.currency),
      progressMode: input.progressMode,
      progressPercent:
        input.progressMode === "manual"
          ? input.progressPercent
          : existing.progressPercent,
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      shareFinancials: input.shareFinancials,
      version: version + 1,
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.ownerId, session.user.id),
        eq(projects.version, version),
      ),
    );

  if (result.meta.changes === 0) {
    return {
      error:
        "Project sudah diubah di tab lain. Muat ulang halaman lalu coba lagi.",
    };
  }

  if (input.progressMode === "auto" && existing.progressMode !== "auto") {
    await recalcProjectProgress(db, projectId);
  }

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "project.updated",
    metadata: { name: input.name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  return { success: "Perubahan project disimpan." };
}

export async function updateProgressAction(
  projectId: string,
  percent: number,
): Promise<ActionState> {
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

  if (!project) return { error: "Project tidak ditemukan." };
  if (project.progressMode !== "manual") {
    return { error: "Ubah mode progress ke manual terlebih dahulu." };
  }

  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  await db
    .update(projects)
    .set({ progressPercent: safePercent, version: project.version + 1 })
    .where(eq(projects.id, projectId));

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "project.progress_updated",
    metadata: { from: project.progressPercent, to: safePercent },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/milestones`);
  return { success: "Progress diperbarui." };
}

export async function archiveProjectAction(
  projectId: string,
): Promise<ActionState> {
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

  if (!project) return { error: "Project tidak ditemukan." };

  await db
    .update(projects)
    .set({ archivedAt: project.archivedAt ? null : new Date() })
    .where(eq(projects.id, projectId));

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: project.archivedAt ? "project.restored" : "project.archived",
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return {
    success: project.archivedAt
      ? "Project dipulihkan dari arsip."
      : "Project diarsipkan.",
  };
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ActionState> {
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

  if (!project) return { error: "Project tidak ditemukan." };

  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(eq(projects.id, projectId));

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect("/projects");
}

export async function duplicateProjectAction(
  sourceProjectId: string,
  options?: {
    customName?: string;
    clientId?: string | null;
  },
): Promise<ActionState & { newProjectId?: string }> {
  const session = await requireOwner();
  const db = await getDb();

  // 1. Fetch source project
  const [sourceProject] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, sourceProjectId),
        eq(projects.ownerId, session.user.id),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!sourceProject) {
    return { error: "Project sumber tidak ditemukan." };
  }

  // 2. Fetch milestones
  const sourceMilestones = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, sourceProjectId),
        isNull(milestones.deletedAt),
      ),
    )
    .orderBy(asc(milestones.position));

  // 3. Fetch payment terms
  const sourceTerms = await db
    .select()
    .from(paymentTerms)
    .where(eq(paymentTerms.projectId, sourceProjectId))
    .orderBy(asc(paymentTerms.position));

  // 4. Create new Project
  const newProjectId = newId();
  const newCode = newProjectCode();
  const newName =
    options?.customName?.trim() || `${sourceProject.name} (Kloning)`;
  let targetClientId =
    options?.clientId !== undefined ? options.clientId : sourceProject.clientId;
  if (targetClientId) {
    targetClientId = await findOwnedClientId(db, session.user.id, targetClientId);
    if (!targetClientId && options?.clientId) return { error: "Customer tidak ditemukan." };
  }

  await db.insert(projects).values({
    id: newProjectId,
    ownerId: session.user.id,
    clientId: targetClientId,
    code: newCode,
    name: newName,
    description: sourceProject.description,
    status: "draft",
    currency: sourceProject.currency,
    totalAmount: sourceProject.totalAmount,
    progressMode: sourceProject.progressMode,
    progressPercent: 0,
    startDate: todayISO(),
    dueDate: null,
    shareFinancials: sourceProject.shareFinancials,
    version: 1,
  });

  // 5. Clone Milestones (status not_started, completedAt null)
  for (const m of sourceMilestones) {
    await db.insert(milestones).values({
      id: newId(),
      projectId: newProjectId,
      title: m.title,
      description: m.description,
      status: "not_started",
      weight: m.weight,
      position: m.position,
      dueDate: null,
      completedAt: null,
    });
  }

  // 6. Clone Payment Terms (status unpaid)
  for (const t of sourceTerms) {
    await db.insert(paymentTerms).values({
      id: newId(),
      projectId: newProjectId,
      label: t.label,
      amount: t.amount,
      status: "unpaid",
      position: t.position,
      dueDate: null,
    });
  }

  // 8. Log activity
  await logActivity(db, {
    projectId: newProjectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "project.created",
    metadata: {
      name: newName,
      duplicatedFrom: sourceProject.name,
      milestonesCount: sourceMilestones.length,
      termsCount: sourceTerms.length,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/reports");

  return {
    success: `Project berhasil diduplikat dengan ${sourceMilestones.length} milestone & ${sourceTerms.length} termin!`,
    newProjectId,
  };
}

