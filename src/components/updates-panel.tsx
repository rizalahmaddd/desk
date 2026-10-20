"use client";

import { useState } from "react";
import {
  AlertCircle,
  FileText,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Attachment } from "@/lib/db/schema";
import {
  createUpdateAction,
  deleteUpdateAction,
} from "@/app/actions/updates";
import { useActionForm } from "@/hooks/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { FileUploader } from "@/components/file-uploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { formatRelative } from "@/lib/dates";

type UpdateRow = {
  id: string;
  title: string;
  body: string | null;
  visibility: "client" | "internal";
  createdAt: Date;
  deletedAt: Date | null;
};

function CreateUpdateDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useActionForm(
    createUpdateAction.bind(null, projectId),
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-xs">
          <Plus className="size-3.5" />
          <span>Posting Update</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Posting Update Project</DialogTitle>
          <DialogDescription>
            Bagikan progres pekerjaan, rangkuman diskusi, atau file hasil revisi kepada client.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {state?.error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="size-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="update-title" className="text-xs font-semibold">Judul Update</Label>
            <Input
              id="update-title"
              name="title"
              className="h-11 rounded-xl"
              placeholder="Contoh: Selesai revisi desain landing page"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-body" className="text-xs font-semibold">Isi Catatan / Ringkasan</Label>
            <Textarea
              id="update-body"
              name="body"
              rows={4}
              className="rounded-xl text-sm leading-relaxed"
              placeholder="Jelaskan hal-hal yang selesai dikerjakan atau poin yang perlu ditinjau oleh client."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-visibility" className="text-xs font-semibold">Visibilitas</Label>
            <NativeSelect
              id="update-visibility"
              name="visibility"
              defaultValue="client"
              className="h-11 rounded-xl"
            >
              <option value="client">Publik untuk Client & Owner</option>
              <option value="internal">Catatan Rahasia Internal (Hanya Freelancer)</option>
            </NativeSelect>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <FileUploader projectId={projectId} label="Lampiran File (Opsional)" maxFiles={5} />
          </div>
          <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs" pending={pending}>
            Publikasikan Update
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UpdatesPanel({
  projectId,
  updates,
  attachmentsByUpdate,
}: {
  projectId: string;
  updates: UpdateRow[];
  attachmentsByUpdate: Record<string, Attachment[]>;
}) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-xs">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div className="space-y-0.5">
          <CardTitle className="text-base sm:text-lg">Update & Kronologi</CardTitle>
          <CardDescription>
            Catatan berkala untuk menjaga transparansi pengerjaan
          </CardDescription>
        </div>
        <CreateUpdateDialog projectId={projectId} />
      </CardHeader>
      <CardContent className="pt-2">
        {updates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Belum ada update pekerjaan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Posting update agar client langsung mendapatkan info perkembangan terbaru saat membuka portal.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {updates.map((update) => {
              const attachments = attachmentsByUpdate[update.id] ?? [];
              const isInternal = update.visibility === "internal";

              return (
                <div
                  key={update.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs transition-colors hover:border-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-heading text-sm sm:text-base font-semibold text-foreground">
                          {update.title}
                        </h4>
                        {isInternal ? (
                          <Badge
                            variant="outline"
                            className="h-5 gap-1 border-amber-500/30 bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                          >
                            <Lock className="size-2.5" />
                            Internal
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Diposting {formatRelative(update.createdAt)}
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                          aria-label="Hapus update"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus update ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Update “{update.title}” akan dihapus secara permanen dari kronologi project.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                          <AlertDialogAction
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              const result = await deleteUpdateAction(
                                projectId,
                                update.id,
                              );
                              if (result?.error) toast.error(result.error);
                              else toast.success(result?.success ?? "Dihapus.");
                            }}
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {update.body ? (
                    <p className="mt-3 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-muted-foreground">
                      {update.body}
                    </p>
                  ) : null}

                  {attachments.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      {attachments.map((file) => (
                        <a
                          key={file.id}
                          href={`/api/files/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <FileText className="size-3.5 text-primary" />
                          <span className="truncate max-w-[200px]">{file.filename}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
