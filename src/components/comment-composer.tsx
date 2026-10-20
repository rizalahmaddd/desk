"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, Lock, Reply, Send } from "lucide-react";
import { createCommentAction } from "@/app/actions/comments";
import { createPortalCommentAction } from "@/app/actions/portal";
import { useActionForm } from "@/hooks/use-action-form";
import { FileUploader } from "@/components/file-uploader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";

export function CommentComposer({
  projectId,
  mode = "owner",
  replyTo,
  onDone,
}: {
  projectId: string;
  mode?: "owner" | "client";
  replyTo?: { id: string; authorName: string; internal: boolean };
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const bodyId = useId();
  const [uploadKey, setUploadKey] = useState(0);
  const [visibility, setVisibility] = useState("client");
  const [uploading, setUploading] = useState(false);

  const action =
    mode === "owner"
      ? createCommentAction.bind(null, projectId)
      : createPortalCommentAction;
  const { state, formAction, pending } = useActionForm(action, {
    onSuccess: () => {
      formRef.current?.reset();
      setUploadKey((key) => key + 1);
      setVisibility("client");
      onDone?.();
    },
  });

  const internal = replyTo ? replyTo.internal : mode === "owner" && visibility === "internal";

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn(
        "space-y-3.5 rounded-2xl border border-border/80 bg-card shadow-xs",
        replyTo ? "p-3 sm:p-4" : "p-4 sm:p-5",
      )}
    >
      {state?.error ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="size-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <Label htmlFor={bodyId} className="font-semibold text-foreground">
            {replyTo
              ? `Balas ${replyTo.authorName}`
              : mode === "owner"
                ? "Tulis Pesan / Masukan"
                : "Tulis Pesan untuk Freelancer"}
          </Label>
          {internal ? (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="size-3" />
              Catatan Internal (Hanya Anda)
            </span>
          ) : null}
        </div>
        <Textarea
          id={bodyId}
          name="body"
          rows={replyTo ? 2 : 3}
          autoFocus={Boolean(replyTo)}
          className="rounded-xl text-sm leading-relaxed"
          placeholder={
            replyTo
              ? "Tulis balasan..."
              : mode === "owner"
                ? "Tulis update progres, permintaan masukan, atau catatan project..."
                : "Tuliskan pertanyaan, revisi, atau konfirmasi terkait milestone ini..."
          }
          required
        />
      </div>

      <input type="hidden" name="entityType" value="project" />
      {replyTo ? <input type="hidden" name="parentId" value={replyTo.id} /> : null}

      <div className="flex flex-col gap-3 border-t border-border/60 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <FileUploader
            key={uploadKey}
            projectId={projectId}
            label="Lampirkan berkas"
            maxFiles={5}
            onBusyChange={setUploading}
          />
          {mode === "owner" && !replyTo ? (
            <NativeSelect
              name="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="h-10 rounded-xl text-xs sm:w-52"
              aria-label="Visibilitas komentar"
            >
              <option value="client">Terlihat Client & Studio</option>
              <option value="internal">Rahasia (Internal Saja)</option>
            </NativeSelect>
          ) : (
            <input type="hidden" name="visibility" value={internal ? "internal" : "client"} />
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {replyTo && onDone ? (
            <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={onDone}>
              Batal
            </Button>
          ) : null}
          <SubmitButton
            className="h-10 gap-2 rounded-xl font-medium shadow-xs"
            pending={pending}
            pendingText="Mengirim..."
            disabled={uploading}
          >
            {replyTo ? <Reply className="size-3.5" /> : <Send className="size-3.5" />}
            <span>{uploading ? "Menunggu upload..." : replyTo ? "Kirim Balasan" : "Kirim Pesan"}</span>
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
