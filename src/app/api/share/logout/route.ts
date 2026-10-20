import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { shareSessions } from "@/lib/db/schema";
import { getOwnerSession } from "@/lib/session";
import { SHARE_COOKIE } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SHARE_COOKIE)?.value;

  if (sessionId) {
    const db = await getDb();
    await db.delete(shareSessions).where(eq(shareSessions.id, sessionId));
    cookieStore.set(SHARE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  const ownerSession = await getOwnerSession();
  const target = ownerSession ? "/shared" : "/share/unavailable";
  return Response.redirect(new URL(target, request.url), 303);
}
