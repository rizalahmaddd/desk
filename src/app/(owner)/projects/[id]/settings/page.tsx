import { ProjectForm } from "@/components/forms/project-form";
import { ProjectDangerZone } from "@/components/project-danger-zone";
import { updateProjectAction } from "@/app/actions/projects";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getClientsForOwner, getProjectForOwner } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const [row, clientsList] = await Promise.all([
    getProjectForOwner(db, session.user.id, id),
    getClientsForOwner(db, session.user.id),
  ]);
  if (!row) return null;

  const boundAction = updateProjectAction.bind(null, id);

  return (
    <div className="space-y-6">
      <ProjectForm
        action={boundAction}
        project={row.project}
        client={row.client}
        clientsList={clientsList}
        submitLabel="Simpan perubahan"
      />

      <ProjectDangerZone
        projectId={id}
        archived={Boolean(row.project.archivedAt)}
      />
    </div>
  );
}
