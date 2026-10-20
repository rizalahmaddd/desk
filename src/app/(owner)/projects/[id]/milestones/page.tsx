import { MilestonesManager } from "@/components/milestones-manager";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getMilestones, getProjectForOwner } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);
  if (!row) return null;

  const milestones = await getMilestones(db, id);

  return <MilestonesManager projectId={id} milestones={milestones} />;
}
