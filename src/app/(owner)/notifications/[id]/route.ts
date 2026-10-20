import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();

  const [notification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientType, "owner"),
        eq(notifications.recipientId, session.user.id),
      ),
    )
    .returning({ payload: notifications.payload });

  const projectId = notification?.payload
    ? (JSON.parse(notification.payload) as { projectId?: string }).projectId
    : undefined;
  redirect(projectId ? `/projects/${projectId}` : "/notifications");
}
