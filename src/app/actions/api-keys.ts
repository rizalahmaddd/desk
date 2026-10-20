"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireOwner } from "@/lib/session";
import { newId } from "@/lib/ids";
import { hashApiKey } from "@/lib/api-auth";

function generateSecureApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pdk_live_${hex}`;
}

export type CreateApiKeyResult =
  | { success: true; key: string; name: string; prefix: string }
  | { success: false; error: string };

export async function createApiKeyAction(
  _prevState: unknown,
  formData: FormData,
): Promise<CreateApiKeyResult> {
  const session = await requireOwner();
  const name = String(formData.get("name") || "").trim();

  if (!name || name.length < 2) {
    return { success: false, error: "Nama kunci API minimal 2 karakter." };
  }

  const rawKey = generateSecureApiKey();
  const keyHash = await hashApiKey(rawKey);
  const keyPrefix = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`;

  const db = await getDb();
  await db.insert(apiKeys).values({
    id: newId(),
    userId: session.user.id,
    name,
    keyHash,
    keyPrefix,
    createdAt: new Date(),
  });

  revalidatePath("/settings");

  return {
    success: true,
    key: rawKey,
    name,
    prefix: keyPrefix,
  };
}

export async function revokeApiKeyAction(formData: FormData) {
  const session = await requireOwner();
  const id = String(formData.get("id") || "").trim();

  if (!id) return;

  const db = await getDb();
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, session.user.id)));

  revalidatePath("/settings");
}
