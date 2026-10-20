"use client";

import { useState } from "react";
import { Archive, AlertOctagon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  archiveProjectAction,
  deleteProjectAction,
} from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
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

export function ProjectDangerZone({
  projectId,
  archived,
}: {
  projectId: string;
  archived: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function toggleArchive() {
    setPending(true);
    const result = await archiveProjectAction(projectId);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else toast.success(result?.success ?? "Project diperbarui.");
  }

  async function remove() {
    setPending(true);
    const result = await deleteProjectAction(projectId);
    if (result?.error) {
      setPending(false);
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 sm:p-6 dark:border-rose-900/40 dark:bg-rose-950/10">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
        <AlertOctagon className="size-4.5" />
        <h3 className="font-heading text-base font-semibold">Zona Berbahaya</h3>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Mengarsipkan project akan menyembunyikannya dari daftar aktif namun data tetap utuh. Menghapus project akan mencabut akses client seketika dan menjadwalkan pembersihan permanen setelah 30 hari.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl font-medium shadow-2xs"
          disabled={pending}
          onClick={toggleArchive}
        >
          <Archive className="size-4" />
          <span>{archived ? "Pulihkan dari Arsip" : "Arsipkan Project Ini"}</span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              className="h-10 gap-2 rounded-xl font-medium shadow-xs"
              disabled={pending}
            >
              <Trash2 className="size-4" />
              <span>Hapus Project</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus project ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tautan portal client akan dinonaktifkan secara otomatis. Anda masih dapat membatalkan tindakan ini dalam kurun waktu 30 hari ke depan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={remove}
              >
                Hapus Project Sekarang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
