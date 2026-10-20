"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { createOrRestoreClient, deleteClientRecord, updateClientRecord } from "@/lib/clients";
import { clientSchema } from "@/lib/validation";
import { firstError, formValues, type ActionState } from "@/lib/actions";

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { clientId?: string }> {
  const session = await requireOwner();
  const parsed = clientSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const db = await getDb();
  const result = await createOrRestoreClient(db, session.user.id, parsed.data);
  if ("error" in result) return { error: result.error };
  const clientId = result.client.id;

  revalidatePath("/clients");
  revalidatePath("/projects");
  return { success: "Customer berhasil ditambahkan.", clientId };
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const parsed = clientSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const db = await getDb();
  const result = await updateClientRecord(db, session.user.id, clientId, parsed.data);
  if ("error" in result) return { error: result.error };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/projects");
  return { success: "Data customer berhasil diperbarui." };
}

export async function deleteClientAction(clientId: string): Promise<ActionState> {
  const session = await requireOwner();
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.ownerId, session.user.id),
        isNull(clients.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return { error: "Customer tidak ditemukan." };
  }

  await deleteClientRecord(db, clientId);

  revalidatePath("/clients");
  revalidatePath("/projects");
  return { success: "Customer berhasil dihapus." };
}
