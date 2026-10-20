"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { profileSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const parsed = profileSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const db = await getDb();
  await db
    .update(user)
    .set({ name: parsed.data.name })
    .where(eq(user.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Profil diperbarui." };
}
