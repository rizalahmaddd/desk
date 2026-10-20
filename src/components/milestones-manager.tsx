"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Milestone } from "@/lib/db/schema";
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABELS,
} from "@/lib/constants";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  reorderMilestoneAction,
  setMilestoneStatusAction,
  updateMilestoneAction,
} from "@/app/actions/milestones";
import { useActionForm } from "@/hooks/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
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
import { MilestoneStatusBadge } from "@/components/status-badge";
import { UrgencyBadge } from "@/components/urgency-badge";
import { formatDate, formatRelative, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

function MilestoneFields({ milestone }: { milestone?: Milestone }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-xs font-semibold">Judul Milestone</Label>
        <Input
          id="title"
          name="title"
          className="h-11 rounded-xl"
          placeholder="Contoh: Finalisasi Wireframe & Prototype"
          defaultValue={milestone?.title}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-semibold">Deskripsi Pekerjaan</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          className="rounded-xl text-sm leading-relaxed"
          placeholder="Detail poin pekerjaan yang harus diselesaikan pada milestone ini."
          defaultValue={milestone?.description ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs font-semibold">Status Awal</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={milestone?.status ?? "not_started"}
            className="h-11 rounded-xl"
          >
            {MILESTONE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MILESTONE_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-xs font-semibold">Bobot Progress (1-100)</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            min={1}
            max={100}
            className="h-11 rounded-xl"
            defaultValue={milestone?.weight ?? 1}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueDate" className="text-xs font-semibold">Target Tanggal Selesai (Opsional)</Label>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          className="h-11 rounded-xl"
          defaultValue={milestone?.dueDate ?? ""}
        />
      </div>
    </div>
  );
}

function CreateMilestoneDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useActionForm(
    createMilestoneAction.bind(null, projectId),
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 gap-2 rounded-xl font-medium shadow-xs">
          <Plus className="size-4" />
          <span>Tambah Milestone</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Tambah Milestone Baru</DialogTitle>
          <DialogDescription>
            Tiap milestone yang diselesaikan akan memperbarui kalkulasi progress project secara otomatis.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {state?.error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="size-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <MilestoneFields />
          <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs" pending={pending}>
            Simpan Milestone
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMilestoneDialog({
  projectId,
  milestone,
}: {
  projectId: string;
  milestone: Milestone;
}) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useActionForm(
    updateMilestoneAction.bind(null, projectId, milestone.id),
    { onSuccess: () => setOpen(false) },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="size-8 rounded-lg shadow-2xs"
          aria-label="Edit milestone"
        >
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Edit Milestone</DialogTitle>
          <DialogDescription>Sesuaikan judul, bobot, atau tenggat waktu milestone ini.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {state?.error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="size-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <MilestoneFields milestone={milestone} />
          <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs" pending={pending}>
            Simpan Perubahan
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MilestoneActions({
  projectId,
  milestone,
  first,
  last,
}: {
  projectId: string;
  milestone: Milestone;
  first: boolean;
  last: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function changeStatus(status: string) {
    startTransition(async () => {
      const result = await setMilestoneStatusAction(
        projectId,
        milestone.id,
        status,
      );
      if (result?.error) toast.error(result.error);
      else toast.success(result?.success ?? "Status diperbarui.");
    });
  }

  function reorder(direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderMilestoneAction(
        projectId,
        milestone.id,
        direction,
      );
      if (result?.error) toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMilestoneAction(projectId, milestone.id);
      if (result?.error) toast.error(result.error);
      else toast.success(result?.success ?? "Milestone dihapus.");
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pt-2 sm:pt-0">
      <NativeSelect
        aria-label="Ubah status milestone"
        value={milestone.status}
        disabled={pending}
        onChange={(event) => changeStatus(event.target.value)}
        className="h-8 w-32 sm:w-34 rounded-lg text-xs font-medium shadow-2xs shrink-0"
      >
        {MILESTONE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MILESTONE_STATUS_LABELS[status]}
          </option>
        ))}
      </NativeSelect>

      <div className="flex items-center gap-1 shrink-0">
        <EditMilestoneDialog projectId={projectId} milestone={milestone} />

        <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/20 shadow-2xs">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md hover:bg-background"
            disabled={pending || first}
            onClick={() => reorder("up")}
            aria-label="Naikkan urutan"
          >
            <ChevronUp className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-md hover:bg-background"
            disabled={pending || last}
            onClick={() => reorder("down")}
            aria-label="Turunkan urutan"
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
              aria-label="Hapus milestone"
              disabled={pending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus milestone ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Milestone “{milestone.title}” akan dihapus. Perhitungan progress project akan disesuaikan kembali.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={remove}
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function MilestonesManager({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: Milestone[];
}) {
  const completedCount = milestones.filter((m) => m.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
            Daftar Milestone
          </h3>
          <p className="text-xs text-muted-foreground">
            {milestones.length} milestone terdaftar ·{" "}
            <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
              {completedCount} selesai
            </strong>
          </p>
        </div>
        <CreateMilestoneDialog projectId={projectId} />
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="font-heading text-base font-semibold text-foreground">Belum ada milestone</p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Tambahkan tahapan milestone agar progress pekerjaan dapat dihitung dan dipantau bersama client.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const isDone = milestone.status === "done";
            const overdue = isOverdue(milestone.dueDate) && !isDone;

            return (
              <div
                key={milestone.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all duration-150",
                  isDone
                    ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10"
                    : "border-border/80 bg-card hover:border-border",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <MilestoneStatusBadge status={milestone.status} />
                      <UrgencyBadge dueDate={milestone.dueDate} isCompleted={isDone} />

                      <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Scale className="size-3" />
                        Bobot {milestone.weight}
                      </span>
                    </div>

                    <h4 className="font-heading text-base font-semibold tracking-tight text-foreground">
                      {milestone.title}
                    </h4>

                    {milestone.description ? (
                      <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {milestone.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {milestone.dueDate
                          ? `Deadline ${formatDate(milestone.dueDate)}`
                          : "Tanpa deadline terikat"}
                      </span>
                      {milestone.completedAt ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Selesai {formatRelative(milestone.completedAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <MilestoneActions
                    projectId={projectId}
                    milestone={milestone}
                    first={index === 0}
                    last={index === milestones.length - 1}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
