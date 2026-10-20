import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "./db";
import { projects } from "./db/schema";
import { getOwnerSession } from "./session";
import { getShareContext } from "./share";

type ShareContext = NonNullable<Awaited<ReturnType<typeof getShareContext>>>;

export type FileActor =
  | { type: "owner"; userId: string; ownerId: string }
  | { type: "client"; share: ShareContext; ownerId: string };

// A signed-in user can also be a client of someone else's project, so owner rights only
// apply to projects they own; everything else falls back to the portal share session.
export async function resolveFileActor(
  db: Database,
  projectId: string | null,
): Promise<FileActor | null> {
  const session = await getOwnerSession();

  if (session && projectId) {
    const [owned] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.ownerId, session.user.id),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);
    if (owned) return { type: "owner", userId: session.user.id, ownerId: session.user.id };
  }

  const share = await getShareContext();
  if (share && (!projectId || projectId === share.project.id)) {
    return { type: "client", share, ownerId: share.project.ownerId };
  }

  return null;
}

export function clientUploaderId(share: ShareContext) {
  return share.access.clientId ?? share.access.id;
}
