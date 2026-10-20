import { and, count, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getSharedProjectsForUser } from "@/lib/queries";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

// Post-login landing: people who only receive shared projects shouldn't start on an empty studio dashboard.
export default async function StartPage() {
  const session = await requireOwner();
  const db = await getDb();

  const [[owned], shared] = await Promise.all([
    db
      .select({ total: count() })
      .from(projects)
      .where(and(eq(projects.ownerId, session.user.id), isNull(projects.deletedAt))),
    getSharedProjectsForUser(db, session.user.id),
  ]);

  redirect(Number(owned?.total ?? 0) === 0 && shared.length > 0 ? "/shared" : "/dashboard");
}
