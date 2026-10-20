import { AccessManager } from "@/components/access-manager";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getProjectAccessList, getProjectForOwner } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);
  if (!row) return null;

  const accesses = await getProjectAccessList(db, id);

  return (
    <AccessManager
      projectId={id}
      projectName={row.project.name}
      accesses={accesses}
    />
  );
}
