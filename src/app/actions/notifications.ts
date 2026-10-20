"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions";

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  const session = await requireOwner();
  const db = await getDb();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientType, "owner"),
        eq(notifications.recipientId, session.user.id),
        isNull(notifications.readAt),
      ),
    );

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: "Semua notifikasi ditandai terbaca." };
}
