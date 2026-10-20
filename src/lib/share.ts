import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  clients,
  projectAccess,
  projects,
  shareSessions,
  type ProjectAccess,
} from "./db/schema";
import { getCloudflareEnv, getDb } from "./db";
import { newId, sha256 } from "./ids";
import { SHARE_SESSION_DAYS } from "./constants";

export const SHARE_COOKIE = "pd_share";

export async function exchangeShareToken(token: string) {
  const db = await getDb();
  const tokenHash = await sha256(token);

  const [access] = await db
    .select()
    .from(projectAccess)
    .where(eq(projectAccess.tokenHash, tokenHash))
    .limit(1);

  if (!access || access.revokedAt) return null;
  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) return null;

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, access.projectId), isNull(projects.deletedAt)),
    )
    .limit(1);

  if (!project) return null;

  return createShareSession(access);
}

export async function createShareSession(access: ProjectAccess) {
  const db = await getDb();
  const now = Date.now();
  const sessionExpiry = now + SHARE_SESSION_DAYS * 86_400_000;
  const expiresAt = new Date(
    Math.min(access.expiresAt?.getTime() ?? sessionExpiry, sessionExpiry),
  );

  const sessionId = newId();
  const requestHeaders = await headers();

  await db.insert(shareSessions).values({
    id: sessionId,
    accessId: access.id,
    projectId: access.projectId,
    expiresAt,
    userAgent: requestHeaders.get("user-agent"),
    ip:
      requestHeaders.get("cf-connecting-ip") ??
      requestHeaders.get("x-forwarded-for"),
  });

  await db
    .update(projectAccess)
    .set({ lastUsedAt: new Date() })
    .where(eq(projectAccess.id, access.id));

  return { sessionId, expiresAt };
}

export async function setShareCookie(sessionId: string, expiresAt: Date) {
  const env = await getCloudflareEnv();
  const cookieStore = await cookies();
  cookieStore.set(SHARE_COOKIE, sessionId, {
    httpOnly: true,
    secure: (env.APP_URL ?? "").startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearShareCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SHARE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getShareContext() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SHARE_COOKIE)?.value;
  if (!sessionId) return null;

  const db = await getDb();
  const rows = await db
    .select({
      session: shareSessions,
      access: projectAccess,
      project: projects,
      client: clients,
    })
    .from(shareSessions)
    .innerJoin(projectAccess, eq(shareSessions.accessId, projectAccess.id))
    .innerJoin(projects, eq(shareSessions.projectId, projects.id))
    .leftJoin(clients, eq(projectAccess.clientId, clients.id))
    .where(
      and(
        eq(shareSessions.id, sessionId),
        gt(shareSessions.expiresAt, new Date()),
        isNull(projectAccess.revokedAt),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.access.expiresAt && row.access.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return {
    sessionId,
    // The project-level switch overrides every link: hiding financials on the project hides them everywhere.
    access: {
      ...row.access,
      canViewFinancials: row.access.canViewFinancials && row.project.shareFinancials,
    },
    project: row.project,
    client: row.client,
  };
}

export async function requireShare() {
  const context = await getShareContext();
  if (!context) redirect("/share/unavailable");
  return context;
}
