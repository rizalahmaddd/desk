import { and, eq, isNull } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { clientUploaderId, resolveFileActor } from "@/lib/file-access";
import { isAttachmentVisibleToClient } from "@/lib/queries";

export const dynamic = "force-dynamic";

async function findFile(id: string) {
  const db = await getDb();
  const [file] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), isNull(attachments.deletedAt)))
    .limit(1);
  return { db, file };
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { db, file } = await findFile(id);
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });

  const actor = await resolveFileActor(db, file.projectId);
  if (!actor) return new Response("Tidak memiliki akses.", { status: 403 });

  if (
    actor.type === "client" &&
    (actor.share.access.scope !== "comment" ||
      file.uploadedByType !== "client" ||
      file.uploadedById !== clientUploaderId(actor.share))
  ) {
    return new Response("Tidak memiliki akses.", { status: 403 });
  }

  // Soft delete only: the daily cron purges the R2 object after the 30-day retention window.
  await db
    .update(attachments)
    .set({ deletedAt: new Date() })
    .where(eq(attachments.id, id));

  return new Response(null, { status: 204 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";

  const { db, file } = await findFile(id);
  if (!file) return new Response("File tidak ditemukan.", { status: 404 });

  const actor = await resolveFileActor(db, file.projectId);
  if (!actor) return new Response("Tidak memiliki akses.", { status: 403 });

  if (
    actor.type === "client" &&
    !(await isAttachmentVisibleToClient(
      db,
      file.id,
      actor.share.project.id,
      actor.share.access.canViewFinancials,
    ))
  ) {
    return new Response("File tidak ditemukan.", { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.FILES.get(file.r2Key);
  if (!object) return new Response("File tidak tersedia.", { status: 404 });

  const canPreview =
    preview &&
    (file.contentType.startsWith("image/") ||
      file.contentType === "application/pdf" ||
      file.contentType.startsWith("text/"));

  return new Response(object.body as unknown as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `${canPreview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
