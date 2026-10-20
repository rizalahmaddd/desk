"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getCloudflareEnv, getDb } from "@/lib/db";
import {
  projectAccess,
  projects,
  shareSessions,
  user,
} from "@/lib/db/schema";
import { newId, randomToken, sha256 } from "@/lib/ids";
import { resolveClientForProject } from "@/lib/clients";
import { accessSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { APP_NAME } from "@/lib/constants";

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

function expiryFromDays(days: number) {
  if (!days) return null;
  return new Date(Date.now() + days * 86_400_000);
}

export async function createAccessAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const parsed = accessSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;
  const client = await resolveClientForProject(db, session.user.id, {
    name: input.clientName,
    email: input.clientEmail,
  });

  const token = randomToken();
  const accessId = newId();
  const expiresAt = expiryFromDays(input.expiresInDays);

  await db.insert(projectAccess).values({
    id: accessId,
    projectId,
    clientId: client?.id ?? null,
    scope: input.scope,
    canViewFinancials: input.canViewFinancials,
    token,
    tokenHash: await sha256(token),
    expiresAt,
  });

  const env = await getCloudflareEnv();
  const url = `${env.APP_URL}/s/${token}`;

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "access.created",
    metadata: { scope: input.scope, canViewFinancials: input.canViewFinancials },
  });

  let emailSent = false;
  if (input.clientEmail) {
    const recipientEmail = input.clientEmail.trim().toLowerCase();
    const [recipientAccount] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, recipientEmail), eq(user.emailVerified, true)))
      .limit(1);
    const accountHint = recipientAccount
      ? `Project ini juga sudah muncul di menu "Dibagikan ke Saya" saat Anda masuk ke ${APP_NAME} dengan email ini.`
      : `Punya akun ${APP_NAME} dengan email ini? Masuk atau daftar untuk melihat semua project yang dibagikan ke Anda di satu tempat.`;

    try {
      await sendEmail({
        to: recipientEmail,
        subject: `Akses project ${project.name}`,
        heading: `Anda diundang ke ${project.name}`,
        body: `${session.user.name} membagikan akses project kepada Anda. Gunakan tombol di bawah untuk melihat progress, pembayaran, file, dan diskusi. ${accountHint}`,
        action: { label: "Buka portal project", url },
      });
      emailSent = true;
    } catch {
      // The link is already stored, so fall back to letting the owner share it manually.
    }
  }

  revalidatePath(`/projects/${projectId}/access`);
  return {
    success: emailSent
      ? "Link akses dibuat dan dikirim ke email client."
      : input.clientEmail
        ? "Link akses dibuat, tapi email gagal terkirim. Salin dan bagikan ke client."
        : "Link akses dibuat. Salin dan bagikan ke client.",
    url,
    id: accessId,
  };
}

export async function revokeAccessAction(
  projectId: string,
  accessId: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const [access] = await db
    .select()
    .from(projectAccess)
    .where(
      and(
        eq(projectAccess.id, accessId),
        eq(projectAccess.projectId, projectId),
      ),
    )
    .limit(1);

  if (!access) return { error: "Link akses tidak ditemukan." };

  await db
    .update(projectAccess)
    .set({ revokedAt: new Date() })
    .where(eq(projectAccess.id, accessId));
  await db
    .delete(shareSessions)
    .where(eq(shareSessions.accessId, accessId));

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "access.revoked",
  });

  revalidatePath(`/projects/${projectId}/access`);
  return { success: "Akses client dicabut." };
}

export async function rotateAccessAction(
  projectId: string,
  accessId: string,
): Promise<ActionState> {
  const { session, db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const [access] = await db
    .select()
    .from(projectAccess)
    .where(
      and(
        eq(projectAccess.id, accessId),
        eq(projectAccess.projectId, projectId),
      ),
    )
    .limit(1);

  if (!access) return { error: "Link akses tidak ditemukan." };

  const token = randomToken();
  const expiresAt =
    access.expiresAt && access.expiresAt.getTime() > Date.now()
      ? access.expiresAt
      : new Date(Date.now() + 30 * 86_400_000);

  await db
    .update(projectAccess)
    .set({
      token,
      tokenHash: await sha256(token),
      revokedAt: null,
      expiresAt,
      lastUsedAt: null,
    })
    .where(eq(projectAccess.id, accessId));
  await db
    .delete(shareSessions)
    .where(eq(shareSessions.accessId, accessId));

  const env = await getCloudflareEnv();

  await logActivity(db, {
    projectId,
    actorType: "owner",
    actorId: session.user.id,
    action: "access.rotated",
  });

  revalidatePath(`/projects/${projectId}/access`);
  return {
    success: "Link baru dibuat. Link lama tidak berlaku lagi.",
    url: `${env.APP_URL}/s/${token}`,
    id: accessId,
  };
}

export async function getAccessShareUrlAction(
  projectId: string,
  accessId: string,
): Promise<{ url?: string; error?: string }> {
  const { db, project } = await ownProject(projectId);
  if (!project) return { error: "Project tidak ditemukan." };

  const [access] = await db
    .select()
    .from(projectAccess)
    .where(
      and(
        eq(projectAccess.id, accessId),
        eq(projectAccess.projectId, projectId),
      ),
    )
    .limit(1);

  if (!access) return { error: "Link akses tidak ditemukan." };
  if (access.revokedAt) return { error: "Akses ini telah dicabut." };

  const env = await getCloudflareEnv();
  const baseUrl = env.APP_URL;

  if (access.token) {
    return { url: `${baseUrl}/s/${access.token}` };
  }

  // Fallback for older rows without token: generate token and save
  const token = randomToken();
  await db
    .update(projectAccess)
    .set({
      token,
      tokenHash: await sha256(token),
    })
    .where(eq(projectAccess.id, accessId));

  return { url: `${baseUrl}/s/${token}` };
}
