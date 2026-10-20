"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, DollarSign, FolderPlus, UserRound } from "lucide-react";
import type { Client, Project } from "@/lib/db/schema";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants";
import { toMajorUnits } from "@/lib/money";
import type { ActionState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/forms/submit-button";

export function ProjectForm({
  action,
  project,
  client,
  clientsList = [],
  submitLabel = "Simpan Project",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  project?: Project;
  client?: Client | null;
  clientsList?: Client[];
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [progressMode, setProgressMode] = useState(
    project?.progressMode ?? "auto",
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(
    project?.clientId ?? client?.id ?? "",
  );
  const [clientName, setClientName] = useState(client?.name ?? "");
  const [clientEmail, setClientEmail] = useState(client?.email ?? "");
  const [clientCompany, setClientCompany] = useState(client?.company ?? "");

  return (
    <form action={formAction} className="space-y-8">
      {project ? <input type="hidden" name="version" value={project.version} /> : null}

      {state?.error ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="size-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-300" />
          <AlertDescription className="text-emerald-900 dark:text-emerald-200">
            {state.success}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Section 1: Info Project */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderPlus className="size-4" />
          </span>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Informasi Project
          </h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold">Nama Project</Label>
            <Input
              id="name"
              name="name"
              className="h-11 rounded-xl text-sm"
              placeholder="Contoh: Redesign Website & Sistem Pemesanan"
              defaultValue={project?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold">Ruang Lingkup / Deskripsi Singkat</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              className="rounded-xl text-sm leading-relaxed"
              placeholder="Jelaskan ringkasan target pekerjaan, deliverables yang dijanjikan, dan catatan penting."
              defaultValue={project?.description ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-semibold">Status Project</Label>
              <NativeSelect id="status" name="status" defaultValue={project?.status ?? "active"} className="h-11 rounded-xl text-sm">
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progressMode" className="text-xs font-semibold">Perhitungan Progress</Label>
              <NativeSelect
                id="progressMode"
                name="progressMode"
                value={progressMode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setProgressMode(event.target.value as "auto" | "manual")
                }
                className="h-11 rounded-xl text-sm"
              >
                <option value="auto">Otomatis Terkalkulasi dari Milestone</option>
                <option value="manual">Manual (Input Persentase)</option>
              </NativeSelect>
            </div>
          </div>

          {progressMode === "manual" ? (
            <div className="space-y-2 pt-1">
              <Label htmlFor="progressPercent" className="text-xs font-semibold">Progress Manual (%)</Label>
              <Input
                id="progressPercent"
                name="progressPercent"
                type="number"
                min={0}
                max={100}
                className="h-11 rounded-xl sm:w-48 tabular-nums font-semibold"
                defaultValue={project?.progressPercent ?? 0}
              />
            </div>
          ) : (
            <input type="hidden" name="progressPercent" value={0} />
          )}
        </div>
      </div>

      {/* Section 2: Data Client */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserRound className="size-4" />
            </span>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Data Customer (Penerima Hasil)
            </h3>
          </div>

          {clientsList.length > 0 ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="clientSelect" className="text-xs text-muted-foreground whitespace-nowrap">
                Pilih Customer:
              </Label>
              <NativeSelect
                id="clientSelect"
                value={selectedClientId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedClientId(id);
                  const found = clientsList.find((c) => c.id === id);
                  if (found) {
                    setClientName(found.name);
                    setClientEmail(found.email ?? "");
                    setClientCompany(found.company ?? "");
                  }
                }}
                className="h-9 rounded-xl text-xs sm:w-60 shadow-2xs"
              >
                <option value="">+ Input Manual / Customer Baru</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
        </div>

        <input type="hidden" name="clientId" value={selectedClientId} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-xs font-semibold">Nama Kontak / PIC</Label>
            <Input
              id="clientName"
              name="clientName"
              className="h-11 rounded-xl text-sm"
              placeholder="Contoh: Pak Budi"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail" className="text-xs font-semibold">Email Customer</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              className="h-11 rounded-xl text-sm"
              placeholder="budi@perusahaan.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientCompany" className="text-xs font-semibold">Nama Perusahaan / Brand</Label>
            <Input
              id="clientCompany"
              name="clientCompany"
              className="h-11 rounded-xl text-sm"
              placeholder="PT Maju Bersama (Opsional)"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Nilai Kontrak & Jadwal */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="size-4" />
          </span>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Nilai Kontrak & Target Waktu
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-xs font-semibold">Mata Uang</Label>
            <NativeSelect
              id="currency"
              name="currency"
              defaultValue={project?.currency ?? "IDR"}
              className="h-11 rounded-xl text-sm"
            >
              <option value="IDR">IDR — Rupiah</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="SGD">SGD — Singapore Dollar</option>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAmount" className="text-xs font-semibold">Total Nilai Project</Label>
            <Input
              id="totalAmount"
              name="totalAmount"
              className="h-11 rounded-xl text-sm font-semibold tabular-nums"
              inputMode="numeric"
              placeholder="15000000"
              defaultValue={
                project ? String(toMajorUnits(project.totalAmount, project.currency)) : ""
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-xs font-semibold">Tanggal Mulai</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              className="h-11 rounded-xl text-sm"
              defaultValue={project?.startDate ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-xs font-semibold">Tenggat Waktu / Deadline</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              className="h-11 rounded-xl text-sm"
              defaultValue={project?.dueDate ?? ""}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3.5 transition-colors hover:bg-muted/30 mt-2">
          <input
            type="checkbox"
            name="shareFinancials"
            defaultChecked={project?.shareFinancials ?? true}
            className="mt-0.5 size-4 rounded border-input accent-primary"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold text-foreground">
              Transparansi Keuangan Terbuka untuk Client
            </span>
            <span className="block text-xs text-muted-foreground">
              Client dapat melihat nominal tagihan, sisa pembayaran, dan mengirimkan bukti transfer di portal mereka.
            </span>
          </span>
        </label>
      </div>

      {/* Form Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton className="h-11 px-6 rounded-xl font-medium shadow-xs">
          {submitLabel}
        </SubmitButton>
        <Button asChild variant="outline" className="h-11 px-5 rounded-xl font-medium">
          <Link href={project ? `/projects/${project.id}/settings` : "/projects"}>
            Batal
          </Link>
        </Button>
      </div>
    </form>
  );
}
