import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { shareSessions } from "@/lib/db/schema";
import { getSharedProjectsForUser } from "@/lib/queries";
import { requireOwner } from "@/lib/session";
import { createShareSession, SHARE_COOKIE, setShareCookie } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await requireOwner();
  const db = await getDb();

  const shared = await getSharedProjectsForUser(db, session.user.id);
  const entry = shared.find((item) => item.project.id === projectId);
  if (!entry) redirect("/shared?unavailable=1");

  const previousSessionId = (await cookies()).get(SHARE_COOKIE)?.value;
  if (previousSessionId) {
    await db.delete(shareSessions).where(eq(shareSessions.id, previousSessionId));
  }

  const { sessionId, expiresAt } = await createShareSession(entry.access);
  await setShareCookie(sessionId, expiresAt);
  redirect("/portal");
}
