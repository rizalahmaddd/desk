"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Lock, MessageSquare, Reply, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import type { Attachment, Comment } from "@/lib/db/schema";
import { deleteCommentAction } from "@/app/actions/comments";
import { CommentComposer } from "@/components/comment-composer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatBytes, formatDateTime, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

type CommentWithAuthor = Comment & { authorName: string };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isImage(file: Attachment) {
  return file.contentType.startsWith("image/");
}

function CommentAttachments({ files }: { files: Attachment[] }) {
  if (files.length === 0) return null;
  const images = files.filter(isImage);
  const others = files.filter((file) => !isImage(file));

  return (
    <div className="space-y-2 border-t border-border/50 pt-2">
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((file) => (
            <a
              key={file.id}
              href={`/api/files/${file.id}?preview=1`}
              target="_blank"
              rel="noreferrer"
              className="group/image relative block aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-muted/40"
              title={file.filename}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file route */}
              <img
                src={`/api/files/${file.id}?preview=1`}
                alt={file.filename}
                loading="lazy"
                className="size-full object-cover transition-transform duration-200 group-hover/image:scale-[1.03]"
              />
            </a>
          ))}
        </div>
      ) : null}
      {others.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {others.map((file) => (
            <a
              key={file.id}
              href={`/api/files/${file.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <FileText className="size-3.5 shrink-0 text-primary" />
              <span className="truncate max-w-[200px]">{file.filename}</span>
              <span className="shrink-0 text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommentsList({
  projectId,
  comments,
  attachmentsByComment,
  canDelete,
  canReply = false,
  mode = "owner",
}: {
  projectId: string;
  comments: CommentWithAuthor[];
  attachmentsByComment: Record<string, Attachment[]>;
  canDelete: boolean;
  canReply?: boolean;
  mode?: "owner" | "client";
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  if (comments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center">
        <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/80" />
        <p className="font-heading text-sm font-semibold text-foreground">
          Belum ada percakapan
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mulai diskusi, berikan masukan, atau ajukan pertanyaan terkait project ini melalui form di atas.
        </p>
      </div>
    );
  }

  const ids = new Set(comments.map((comment) => comment.id));
  const repliesByParent = new Map<string, CommentWithAuthor[]>();
  const roots: CommentWithAuthor[] = [];
  for (const comment of comments) {
    // A reply whose parent the viewer can't see is shown on its own rather than dropped.
    if (comment.parentId && ids.has(comment.parentId)) {
      repliesByParent.set(comment.parentId, [...(repliesByParent.get(comment.parentId) ?? []), comment]);
    } else {
      roots.push(comment);
    }
  }

  function renderComment(comment: CommentWithAuthor, isReply: boolean) {
    const attachments = comment.deletedAt ? [] : (attachmentsByComment[comment.id] ?? []);
    const isClient = comment.authorType === "client";
    const isInternal = comment.visibility === "internal";

    return (
      <div
        className={cn(
          "group/comment relative flex gap-3.5 rounded-2xl border shadow-2xs transition-colors",
          isReply ? "p-3 sm:p-4" : "p-4 sm:p-5",
          isInternal
            ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10"
            : "border-border/80 bg-card",
        )}
      >
        <Avatar className={cn("mt-0.5 shrink-0 ring-2 ring-border/80", isReply ? "size-7" : "size-9")}>
          <AvatarFallback className={cn("text-xs font-semibold", isClient ? "bg-muted text-foreground" : "bg-primary/10 text-primary")}>
            {comment.authorName ? initials(comment.authorName) : <User className="size-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-sm font-semibold text-foreground">
                {comment.authorName}
              </span>

              {isClient ? (
                <Badge variant="outline" className="border-border bg-muted/60 text-[10px] font-semibold text-muted-foreground">
                  Client
                </Badge>
              ) : (
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
                  Studio
                </Badge>
              )}

              {isInternal && !isReply ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                >
                  <Lock className="size-2.5" />
                  Catatan Internal (Rahasia)
                </Badge>
              ) : null}

              <span className="text-xs text-muted-foreground" title={formatDateTime(comment.createdAt)}>
                {formatRelative(comment.createdAt)}
              </span>
            </div>

            {canDelete && !comment.deletedAt ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 rounded-lg text-muted-foreground transition-opacity hover:bg-rose-500/10 hover:text-rose-600 focus:opacity-100 sm:opacity-0 sm:group-hover/comment:opacity-100"
                    aria-label="Hapus komentar"
                    disabled={deleting === comment.id}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus komentar ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Pesan tidak akan terlihat lagi oleh partisipan diskusi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setDeleting(comment.id);
                        const result = await deleteCommentAction(projectId, comment.id);
                        setDeleting(null);
                        if (result?.error) toast.error(result.error);
                        else {
                          toast.success(result?.success ?? "Komentar dihapus.");
                          router.refresh();
                        }
                      }}
                    >
                      Hapus Komentar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>

          {comment.deletedAt ? (
            <p className="text-xs sm:text-sm italic text-muted-foreground">
              (Pesan telah dihapus)
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed text-foreground/90">
              {comment.body}
            </p>
          )}

          <CommentAttachments files={attachments} />

          {comment.editedAt ? (
            <p className="text-[10px] text-muted-foreground" title={formatDateTime(comment.createdAt)}>
              Diedit
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roots.map((comment) => {
        const replies = repliesByParent.get(comment.id) ?? [];
        const isReplying = replyingTo === comment.id;
        const replyable = canReply && !comment.deletedAt;

        return (
          <div key={comment.id} className="space-y-2">
            {renderComment(comment, false)}

            {replies.length > 0 || isReplying || replyable ? (
              <div className="ml-5 space-y-2 border-l-2 border-border/70 pl-3 sm:ml-12 sm:pl-4">
                {replies.map((reply) => (
                  <div key={reply.id}>{renderComment(reply, true)}</div>
                ))}

                {isReplying ? (
                  <CommentComposer
                    projectId={projectId}
                    mode={mode}
                    replyTo={{
                      id: comment.id,
                      authorName: comment.authorName,
                      internal: comment.visibility === "internal",
                    }}
                    onDone={() => setReplyingTo(null)}
                  />
                ) : replyable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => setReplyingTo(comment.id)}
                  >
                    <Reply className="size-3.5" />
                    Balas
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
