import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "./db";
import { clients, projectAccess, shareSessions, type Client } from "./db/schema";
import { newId } from "./ids";

type ClientFields = {
  name?: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
};

export function normalizeEmail(value?: string | null) {
  const email = (value ?? "").trim().toLowerCase();
  return email || null;
}

export async function findOwnedClientId(db: Database, ownerId: string, clientId: string) {
  const [row] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId), isNull(clients.deletedAt)))
    .limit(1);
  return row?.id ?? null;
}

async function findByEmail(db: Database, ownerId: string, email: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.ownerId, ownerId), eq(clients.email, email)))
    .limit(1);
  return row ?? null;
}

// (owner_id, email) is unique even for soft-deleted rows, so a deleted customer holding an
// address is brought back instead of inserting a duplicate.
export async function createOrRestoreClient(
  db: Database,
  ownerId: string,
  fields: ClientFields & { name: string },
): Promise<{ client: Client; restored: boolean } | { error: string }> {
  const email = normalizeEmail(fields.email);
  const values = {
    name: fields.name.trim(),
    email,
    company: fields.company?.trim() || null,
    phone: fields.phone?.trim() || null,
  };

  if (email) {
    const holder = await findByEmail(db, ownerId, email);
    if (holder && !holder.deletedAt) {
      return { error: "Customer dengan email ini sudah terdaftar di workspace Anda." };
    }
    if (holder) {
      const [client] = await db
        .update(clients)
        .set({ ...values, deletedAt: null, updatedAt: new Date() })
        .where(eq(clients.id, holder.id))
        .returning();
      return { client, restored: true };
    }
  }

  const [client] = await db
    .insert(clients)
    .values({ id: newId(), ownerId, ...values })
    .returning();
  return { client, restored: false };
}

export async function updateClientRecord(
  db: Database,
  ownerId: string,
  clientId: string,
  fields: ClientFields,
): Promise<{ client: Client } | { error: string }> {
  const [existing] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId), isNull(clients.deletedAt)))
    .limit(1);
  if (!existing) return { error: "Customer tidak ditemukan." };

  const updates: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() };
  if (fields.name !== undefined) updates.name = fields.name.trim();
  if (fields.company !== undefined) updates.company = fields.company?.trim() || null;
  if (fields.phone !== undefined) updates.phone = fields.phone?.trim() || null;

  if (fields.email !== undefined) {
    const email = normalizeEmail(fields.email);
    if (email && email !== existing.email) {
      const holder = await findByEmail(db, ownerId, email);
      if (holder && !holder.deletedAt) {
        return { error: "Email ini sudah digunakan oleh customer lain." };
      }
      if (holder) {
        await db.update(clients).set({ email: null }).where(eq(clients.id, holder.id));
      }
    }
    updates.email = email;
  }

  const [client] = await db.update(clients).set(updates).where(eq(clients.id, clientId)).returning();
  return { client };
}

// Used when a project only names a customer: reuse the one with that email, otherwise create it.
export async function resolveClientForProject(
  db: Database,
  ownerId: string,
  fields: ClientFields,
): Promise<Client | null> {
  const email = normalizeEmail(fields.email);
  const name = fields.name?.trim() ?? "";
  if (!name && !email) return null;

  if (email) {
    const holder = await findByEmail(db, ownerId, email);
    if (holder && !holder.deletedAt) return holder;
  }

  const result = await createOrRestoreClient(db, ownerId, {
    ...fields,
    name: name || (email as string),
  });
  return "error" in result ? null : result.client;
}

export async function deleteClientRecord(db: Database, clientId: string) {
  const now = new Date();
  await db
    .update(clients)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(clients.id, clientId));

  const accessRows = await db
    .select({ id: projectAccess.id })
    .from(projectAccess)
    .where(and(eq(projectAccess.clientId, clientId), isNull(projectAccess.revokedAt)));

  for (const access of accessRows) {
    await db.update(projectAccess).set({ revokedAt: now }).where(eq(projectAccess.id, access.id));
    await db.delete(shareSessions).where(eq(shareSessions.accessId, access.id));
  }
}
