import { and, eq, isNull, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { clientUploaderId, resolveFileActor } from "@/lib/file-access";
import { attachments, projects } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { MAX_FILE_BYTES, OWNER_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import {
  buildObjectKey,
  isAllowedFile,
  matchesFileSignature,
} from "@/lib/files";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const filenameHeader = request.headers.get("x-file-name");
  const contentType =
    request.headers.get("content-type") ?? "application/octet-stream";
  const requestedProjectId = request.headers.get("x-project-id");

  if (!filenameHeader) {
    return Response.json(
      { error: "Nama file tidak ditemukan." },
      { status: 400 },
    );
  }

  let filename: string;
  try {
    filename = decodeURIComponent(filenameHeader);
  } catch {
    return Response.json({ error: "Nama file tidak valid." }, { status: 400 });
  }
  if (!isAllowedFile(filename, contentType)) {
    return Response.json(
      { error: "Tipe file tidak diizinkan." },
      { status: 400 },
    );
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_FILE_BYTES) {
    return Response.json(
      { error: "Ukuran file melebihi batas 50 MB." },
      { status: 413 },
    );
  }

  const db = await getDb();
  const actor = await resolveFileActor(db, requestedProjectId);
  if (!actor) {
    return Response.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  if (actor.type === "client" && actor.share.access.scope !== "comment") {
    return Response.json(
      { error: "Anda hanya memiliki akses melihat." },
      { status: 403 },
    );
  }
  const projectId = actor.type === "owner" ? requestedProjectId! : actor.share.project.id;

  const buffer = new Uint8Array(await request.arrayBuffer());
  if (buffer.byteLength === 0) {
    return Response.json({ error: "File kosong." }, { status: 400 });
  }
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return Response.json(
      { error: "Ukuran file melebihi batas 50 MB." },
      { status: 413 },
    );
  }
  if (!matchesFileSignature(buffer, contentType)) {
    return Response.json(
      { error: "Isi file tidak sesuai dengan tipe yang dinyatakan." },
      { status: 400 },
    );
  }

  const ownerId = actor.ownerId;
  const [usage] = await db
    .select({
      total: sql<number>`coalesce(sum(${attachments.sizeBytes}), 0)`,
    })
    .from(attachments)
    .innerJoin(projects, eq(attachments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        isNull(attachments.deletedAt),
      ),
    );

  if (
    Number(usage?.total ?? 0) + buffer.byteLength >
    OWNER_STORAGE_QUOTA_BYTES
  ) {
    return Response.json(
      { error: "Kuota penyimpanan 10 GB telah tercapai." },
      { status: 413 },
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const key = buildObjectKey(projectId, filename);

  await env.FILES.put(key, buffer, {
    httpMetadata: { contentType },
    customMetadata: {
      projectId,
      uploadedByType: actor.type,
    },
  });

  const attachmentId = newId();
  await db.insert(attachments).values({
    id: attachmentId,
    projectId,
    r2Key: key,
    filename,
    contentType,
    sizeBytes: buffer.byteLength,
    entityType: "project",
    uploadedByType: actor.type,
    uploadedById: actor.type === "owner" ? actor.userId : clientUploaderId(actor.share),
  });

  return Response.json({
    id: attachmentId,
    filename,
    contentType,
    sizeBytes: buffer.byteLength,
  });
}
