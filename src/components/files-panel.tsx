"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileArchive,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import type { Attachment } from "@/lib/db/schema";
import { FileUploader } from "@/components/file-uploader";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDateTime } from "@/lib/dates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function fileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType.startsWith("video/")) return Film;
  if (contentType === "application/zip" || contentType.includes("compressed") || contentType.includes("tar")) return FileArchive;
  return FileText;
}

export function FilesPanel({
  projectId,
  attachments,
  canDelete = true,
  canUpload = true,
}: {
  projectId: string;
  attachments: Attachment[];
  canDelete?: boolean;
  canUpload?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    setDeleting(id);
    const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!response.ok) {
      toast.error("Gagal menghapus file.");
      return;
    }
    toast.success("File berhasil dihapus.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      {canUpload ? (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="size-4" />
            </span>
            <div>
              <h4 className="font-heading text-sm font-semibold text-foreground">
                Unggah Berkas & Deliverable
              </h4>
              <p className="text-xs text-muted-foreground">
                Maksimal 50 MB per berkas. Berkas akan langsung tersedia untuk diunduh client di portal.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <FileUploader
              projectId={projectId}
              label="Pilih atau seret berkas ke sini"
              onUploaded={() => router.refresh()}
            />
          </div>
        </div>
      ) : null}

      {/* Files List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Daftar Berkas ({attachments.length})
          </h4>
        </div>

        {attachments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center">
            <FolderOpen className="mx-auto mb-2 size-8 text-muted-foreground/80" />
            <p className="font-heading text-sm font-semibold text-foreground">
              Belum ada berkas tersimpan
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Berkas yang diunggah di sini atau lampiran pada forum diskusi akan otomatis terpusat di halaman ini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <div className="divide-y divide-border/60">
              {attachments.map((file) => {
                const Icon = fileIcon(file.contentType);
                const isImage = file.contentType.startsWith("image/");
                const isPdf = file.contentType === "application/pdf";

                return (
                  <div
                    key={file.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/10"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-foreground">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-heading text-sm font-semibold text-foreground">
                          {file.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.sizeBytes)} ·{" "}
                          <span className="font-medium text-foreground">
                            {file.uploadedByType === "client" ? "Diunggah Client" : "Diunggah Studio"}
                          </span>{" "}
                          · {formatDateTime(file.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                      {isImage || isPdf ? (
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs font-medium shadow-2xs">
                          <a
                            href={`/api/files/${file.id}?preview=1`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>Pratinjau</span>
                          </a>
                        </Button>
                      ) : null}

                      <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs font-medium shadow-2xs">
                        <a href={`/api/files/${file.id}`} download>
                          <Download className="size-3.5" />
                          <span>Unduh</span>
                        </a>
                      </Button>

                      {canDelete ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                              disabled={deleting === file.id}
                              aria-label="Hapus file"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus berkas ini?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Berkas “{file.filename}” akan dihapus secara permanen dari server penyimpanan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => remove(file.id)}
                              >
                                Hapus Berkas
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
