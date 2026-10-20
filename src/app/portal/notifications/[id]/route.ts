import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireShare } from "@/lib/share";

export const dynamic = "force-dynamic";

function portalPathFor(type: string) {
  if (type.startsWith("payment")) return "/portal/payments";
  if (type.includes("comment")) return "/portal/comments";
  if (type.startsWith("update") || type.startsWith("milestone")) return "/portal/progress";
  return "/portal/notifications";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await requireShare();
  const db = await getDb();

  const [notification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientType, "client"),
        eq(notifications.recipientId, context.access.clientId ?? context.access.id),
      ),
    )
    .returning({ type: notifications.type });

  redirect(notification ? portalPathFor(notification.type) : "/portal/notifications");
}
