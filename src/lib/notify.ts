import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Database } from "./db";
import { getCloudflareEnv } from "./db";
import { projectAccess, projects, user } from "./db/schema";
import { createNotification } from "./activity";
import { sendEmail } from "./email";

type Notice = {
  type: string;
  title: string;
  message: string;
};

export async function notifyOwner(
  db: Database,
  ownerId: string,
  projectId: string,
  notice: Notice,
) {
  const [owner] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);

  const [project] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  await createNotification(db, {
    recipientType: "owner",
    recipientId: ownerId,
    type: notice.type,
    payload: { ...notice, projectId },
  });

  if (!owner?.email) return;
  const env = await getCloudflareEnv();
  const url = `${env.APP_URL}/projects/${projectId}`;

  // The in-app notification is already stored; a failed email must not fail the client's action.
  try {
    await sendEmail({
      to: owner.email,
      subject: `${notice.title} — ${project?.name ?? "Project"}`,
      heading: notice.title,
      body: notice.message,
      action: { label: "Buka project", url },
    });
  } catch {}
}

export async function notifyClients(
  db: Database,
  projectId: string,
  notice: Notice,
  options: { requireFinancials?: boolean } = {},
) {
  const conditions = [
    eq(projectAccess.projectId, projectId),
    isNull(projectAccess.revokedAt),
    or(isNull(projectAccess.expiresAt), gt(projectAccess.expiresAt, new Date())),
  ];
  if (options.requireFinancials) {
    conditions.push(eq(projectAccess.canViewFinancials, true), eq(projects.shareFinancials, true));
  }

  const rows = await db
    .select({ clientId: projectAccess.clientId })
    .from(projectAccess)
    .innerJoin(projects, eq(projectAccess.projectId, projects.id))
    .where(and(...conditions));

  const clientIds = Array.from(
    new Set(
      rows
        .map((row) => row.clientId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  await Promise.all(
    clientIds.map((clientId) =>
      createNotification(db, {
        recipientType: "client",
        recipientId: clientId,
        type: notice.type,
        payload: { ...notice, projectId },
      }),
    ),
  );
}
