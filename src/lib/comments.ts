import { and, eq } from "drizzle-orm";
import type { Database } from "./db";
import { comments, type Comment } from "./db/schema";

// Threads are one level deep: replying to a reply attaches to that reply's root.
export async function resolveReplyParent(
  db: Database,
  projectId: string,
  parentId: string,
  viewer: "owner" | "client",
): Promise<{ parent: Comment } | { error: string }> {
  const [target] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, parentId), eq(comments.projectId, projectId)))
    .limit(1);

  if (!target || (viewer === "client" && target.visibility !== "client")) {
    return { error: "Komentar yang ingin dibalas tidak ditemukan." };
  }

  if (!target.parentId) {
    return target.deletedAt
      ? { error: "Komentar yang ingin dibalas sudah dihapus." }
      : { parent: target };
  }

  const [root] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, target.parentId), eq(comments.projectId, projectId)))
    .limit(1);
  return { parent: root ?? target };
}
