"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MAX_FILE_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/dates";

type UploadedFile = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export function FileUploader({
  projectId,
  accept,
  label = "Lampirkan file",
  maxFiles = 10,
  onUploaded,
  onBusyChange,
}: {
  projectId: string;
  accept?: string;
  label?: string;
  maxFiles?: number;
  onUploaded?: (files: UploadedFile[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const [progress, setProgress] = useState(0);
  const uploading = activeUploads > 0;

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  function upload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`${file.name} melebihi batas 50 MB.`);
      return;
    }

    setActiveUploads((count) => count + 1);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.setRequestHeader("x-project-id", projectId);
    xhr.setRequestHeader(
      "content-type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setActiveUploads((count) => count - 1);
      if (xhr.status >= 200 && xhr.status < 300) {
        const uploaded = JSON.parse(xhr.responseText) as UploadedFile;
        setFiles((current) => {
          const next = [...current, uploaded];
          onUploaded?.(next);
          return next;
        });
        setProgress(100);
        toast.success(`${uploaded.filename} terunggah.`);
      } else {
        let message = "Upload gagal.";
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {
          // ignore
        }
        toast.error(message);
        setProgress(0);
      }
    };

    xhr.onerror = () => {
      setActiveUploads((count) => count - 1);
      setProgress(0);
      toast.error("Upload gagal. Periksa koneksi Anda.");
    };

    xhr.send(file);
  }

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const remaining = maxFiles - files.length;
    if (selected.length > remaining) {
      toast.error(`Maksimal ${maxFiles} file per pesan.`);
    }
    selected.slice(0, Math.max(remaining, 0)).forEach(upload);
    event.target.value = "";
  }

  async function remove(file: UploadedFile) {
    const result = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (!result.ok) {
      toast.error("Gagal menghapus file.");
      return;
    }
    setFiles((current) => {
      const next = current.filter((item) => item.id !== file.id);
      onUploaded?.(next);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <input
          key={file.id}
          type="hidden"
          name="attachmentIds"
          value={file.id}
        />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleSelect}
          multiple={maxFiles > 1}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={uploading || files.length >= maxFiles}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : files.length > 0 ? (
            <Paperclip className="size-3.5" />
          ) : (
            <FileUp className="size-3.5" />
          )}
          {label}
        </Button>
        <span className="text-xs text-muted-foreground">
          Maks. 50 MB{maxFiles > 1 ? `, ${maxFiles} file` : ""}
        </span>
      </div>

      {uploading ? (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            Mengunggah... {progress}%
          </p>
        </div>
      ) : null}

      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs"
        >
          <span className="truncate">
            {file.filename}{" "}
            <span className="text-muted-foreground">
              ({formatBytes(file.sizeBytes)})
            </span>
          </span>
          <button
            type="button"
            onClick={() => remove(file)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Hapus ${file.filename}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
