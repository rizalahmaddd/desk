import { FilesPanel } from "@/components/files-panel";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import { getClientVisibleAttachments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PortalFilesPage() {
  const context = await requireShare();
  const db = await getDb();
  const files = await getClientVisibleAttachments(
    db,
    context.project.id,
    context.access.canViewFinancials,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Berkas & Deliverable Project
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Unduh dokumen hasil pekerjaan, aset desain, atau kirimkan berkas referensi untuk freelancer.
        </p>
      </div>

      <FilesPanel
        projectId={context.project.id}
        attachments={files}
        canDelete={false}
        canUpload={context.access.scope === "comment"}
      />
    </div>
  );
}
