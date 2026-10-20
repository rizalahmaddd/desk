import { CommentComposer } from "@/components/comment-composer";
import { CommentsList } from "@/components/comments-list";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import {
  getAttachments,
  getCommentsWithAuthors,
  getProjectForOwner,
} from "@/lib/queries";
import type { Attachment } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function CommentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);
  if (!row) return null;

  const [comments, files] = await Promise.all([
    getCommentsWithAuthors(db, id, true),
    getAttachments(db, id),
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
    <div className="space-y-5">
      <CommentComposer projectId={id} mode="owner" />
      <CommentsList
        projectId={id}
        comments={comments}
        attachmentsByComment={attachmentsByComment}
        canDelete
        canReply
        mode="owner"
      />
    </div>
  );
}
