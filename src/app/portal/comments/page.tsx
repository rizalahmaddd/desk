import { CommentComposer } from "@/components/comment-composer";
import { CommentsList } from "@/components/comments-list";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import { getClientVisibleAttachments, getCommentsWithAuthors } from "@/lib/queries";
import type { Attachment } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function PortalCommentsPage() {
  const context = await requireShare();
  const db = await getDb();
  const [comments, files] = await Promise.all([
    getCommentsWithAuthors(db, context.project.id, false),
    getClientVisibleAttachments(db, context.project.id, context.access.canViewFinancials),
  ]);

  const attachmentsByComment = files.reduce<Record<string, Attachment[]>>(
    (groups, file) => {
      if (file.entityType === "comment" && file.entityId) {
        groups[file.entityId] = [...(groups[file.entityId] ?? []), file];
      }
      return groups;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Forum Diskusi & Umpan Balik
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Saluran komunikasi dua arah langsung dengan freelancer untuk evaluasi pekerjaan dan revisi.
        </p>
      </div>

      {context.access.scope === "comment" ? (
        <CommentComposer projectId={context.project.id} mode="client" />
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-4 text-xs sm:text-sm text-muted-foreground text-center">
          Tautan akses Anda berstatus melihat saja (read-only). Hubungi freelancer jika ingin mengaktifkan izin diskusi.
        </div>
      )}

      <CommentsList
        projectId={context.project.id}
        comments={comments}
        attachmentsByComment={attachmentsByComment}
        canDelete={false}
        canReply={context.access.scope === "comment"}
        mode="client"
      />
    </div>
  );
}
