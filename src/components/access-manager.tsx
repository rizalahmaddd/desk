"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Link2,
  MessageCircle,
  RefreshCw,
  ShieldOff,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { Client, ProjectAccess } from "@/lib/db/schema";
import {
  createAccessAction,
  getAccessShareUrlAction,
  revokeAccessAction,
  rotateAccessAction,
} from "@/app/actions/access";
import { buildWhatsAppUrl, formatPortalShareText } from "@/lib/whatsapp";
import { useActionForm } from "@/hooks/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { CopyButton } from "@/components/copy-button";
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
import { formatDateTime, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

type AccessRow = { access: ProjectAccess; client: Client | null };

function accessStatus(access: ProjectAccess) {
  if (access.revokedAt) return "revoked";
  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) return "expired";
  return "active";
}

function CreateAccessForm({ projectId }: { projectId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const { state, formAction, pending } = useActionForm(
    createAccessAction.bind(null, projectId),
    { onSuccess: (result) => setUrl(result.url ?? null) },
  );

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Link2 className="size-4.5" />
        </span>
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">
            Buat Link Akses Client
          </h3>
          <p className="text-xs text-muted-foreground">
            Client dapat melihat progres, dokumen, dan melakukan konfirmasi pembayaran tanpa perlu membuat akun.
          </p>
        </div>
      </div>

      {url ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            <span>Link portal client berhasil dibuat! Simpan atau salin sekarang:</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl border border-emerald-500/20 bg-background/80 px-3 py-2 text-xs font-mono text-foreground">
              {url}
            </code>
            <CopyButton value={url} className="h-9 px-4 rounded-xl shadow-xs" />
          </div>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4 pt-1">
        {state?.error ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="size-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-xs font-semibold">Nama Client / PIC</Label>
            <Input
              id="clientName"
              name="clientName"
              className="h-11 rounded-xl"
              placeholder="Contoh: Pak Budi (Acme Corp)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail" className="text-xs font-semibold">Email Client (Opsional)</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              className="h-11 rounded-xl"
              placeholder="budi@acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope" className="text-xs font-semibold">Hak Akses</Label>
            <NativeSelect id="scope" name="scope" defaultValue="comment" className="h-11 rounded-xl">
              <option value="comment">Bisa Melihat & Mengirim Pesan / Komentar</option>
              <option value="view">Hanya Melihat (Read-Only)</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresInDays" className="text-xs font-semibold">Masa Berlaku Tautan</Label>
            <NativeSelect id="expiresInDays" name="expiresInDays" defaultValue="30" className="h-11 rounded-xl">
              <option value="7">7 Hari</option>
              <option value="30">30 Hari (Direkomendasikan)</option>
              <option value="90">90 Hari</option>
              <option value="0">Tanpa Batas Waktu</option>
            </NativeSelect>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 p-3.5 transition-colors hover:bg-muted/30">
          <input
            type="checkbox"
            name="canViewFinancials"
            defaultChecked
            className="mt-0.5 size-4 rounded border-input accent-primary"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold text-foreground">
              Izinkan client melihat transparansi keuangan & pembayaran
            </span>
            <span className="block text-xs text-muted-foreground">
              Termasuk nominal termin, total terbayar, sisa tagihan, dan formulir konfirmasi pembayaran.
            </span>
          </span>
        </label>

        <SubmitButton className="h-11 gap-2 rounded-xl font-medium shadow-xs" pending={pending}>
          <KeyRound className="size-4" />
          <span>Generate Link Portal Client</span>
        </SubmitButton>
      </form>
    </div>
  );
}

function AccessActions({
  projectId,
  access,
  client,
  projectName,
}: {
  projectId: string;
  access: ProjectAccess;
  client?: Client | null;
  projectName?: string;
}) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const status = accessStatus(access);

  async function shareWhatsApp() {
    let targetUrl = newUrl;
    if (!targetUrl && access.token && typeof window !== "undefined") {
      targetUrl = `${window.location.origin}/s/${access.token}`;
    }
    if (!targetUrl) {
      setPending(true);
      const res = await getAccessShareUrlAction(projectId, access.id);
      setPending(false);
      if (res.error || !res.url) {
        toast.error(res.error || "Gagal mengambil tautan akses.");
        return;
      }
      targetUrl = res.url;
      setNewUrl(targetUrl);
    }

    const text = formatPortalShareText({
      clientName: client?.name,
      projectName: projectName || "Project",
      portalUrl: targetUrl,
    });
    window.open(buildWhatsAppUrl(client?.phone, text), "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    if (newUrl) {
      try {
        await navigator.clipboard.writeText(newUrl);
        setCopied(true);
        toast.success("Tautan portal client berhasil disalin!");
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fallback
      }
    }

    if (access.token && typeof window !== "undefined") {
      const url = `${window.location.origin}/s/${access.token}`;
      setNewUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Tautan portal client berhasil disalin!");
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fallback
      }
    }

    setPending(true);
    const res = await getAccessShareUrlAction(projectId, access.id);
    setPending(false);

    if (res.error || !res.url) {
      toast.error(res.error || "Gagal mengambil tautan akses.");
      return;
    }

    setNewUrl(res.url);
    try {
      await navigator.clipboard.writeText(res.url);
      setCopied(true);
      toast.success("Tautan portal client berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Tautan ditampilkan di bawah, silakan salin.");
    }
  }

  async function rotate() {
    setPending(true);
    const result = await rotateAccessAction(projectId, access.id);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setNewUrl(result?.url ?? null);
    toast.success(result?.success ?? "Link baru dibuat.");
  }

  async function revoke() {
    setPending(true);
    const result = await revokeAccessAction(projectId, access.id);
    setPending(false);
    if (result?.error) toast.error(result.error);
    else toast.success(result?.success ?? "Akses dicabut.");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {status !== "revoked" ? (
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={copyLink}
            disabled={pending}
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                <span>Link Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Salin Link</span>
              </>
            )}
          </Button>
        ) : null}

        {status !== "revoked" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-2xs border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
            onClick={shareWhatsApp}
            disabled={pending}
          >
            <MessageCircle className="size-3.5 fill-[#25D366]" />
            <span>Kirim via WA</span>
          </Button>
        ) : null}

        {status !== "revoked" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-medium shadow-2xs"
            onClick={rotate}
            disabled={pending}
          >
            <RefreshCw className="size-3.5" />
            <span>Rotasi Link Baru</span>
          </Button>
        ) : null}

        {status !== "revoked" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-2xs border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
            onClick={shareWhatsApp}
            disabled={pending}
          >
            <MessageCircle className="size-3.5 fill-[#25D366]" />
            <span>Kirim via WA</span>
          </Button>
        ) : null}

        {status === "active" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-500/10"
                disabled={pending}
              >
                <ShieldOff className="size-3.5" />
                <span>Cabut Akses</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Cabut akses client?</AlertDialogTitle>
                <AlertDialogDescription>
                  Client tidak akan bisa membuka portal ini lagi. Tautan sebelumnya akan langsung nonaktif seketika.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={revoke}
                >
                  Cabut Akses Sekarang
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {newUrl ? (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:flex-row sm:items-center">
          <code className="flex-1 break-all font-mono text-[11px] text-foreground">{newUrl}</code>
          <CopyButton value={newUrl} className="h-7 px-3 text-xs" />
        </div>
      ) : null}
    </div>
  );
}

export function AccessManager({
  projectId,
  projectName,
  accesses,
}: {
  projectId: string;
  projectName?: string;
  accesses: AccessRow[];
}) {
  return (
    <div className="space-y-6">
      <CreateAccessForm projectId={projectId} />

      <div className="space-y-3">
        <h4 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Daftar Link & Riwayat Akses ({accesses.length})
        </h4>

        {accesses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-center text-xs sm:text-sm text-muted-foreground">
            Belum ada tautan akses yang dibagikan untuk project ini.
          </div>
        ) : (
          <div className="space-y-3">
            {accesses.map(({ access, client }) => {
              const status = accessStatus(access);

              return (
                <div
                  key={access.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs transition-colors hover:border-border"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <UserRound className="size-3.5" />
                        </span>
                        <p className="font-heading text-sm font-semibold text-foreground">
                          {client?.name ?? "Tautan Umum Client"}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-[10px] font-semibold",
                            status === "active" &&
                              "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                            status === "expired" &&
                              "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                            status === "revoked" &&
                              "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                          )}
                        >
                          {status === "active"
                            ? "Aktif"
                            : status === "expired"
                              ? "Kedaluwarsa"
                              : "Dicabut"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {client?.email ? (
                          <span className="font-medium text-foreground">{client.email} ·</span>
                        ) : null}
                        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-medium">
                          {access.scope === "comment" ? "Bisa Berkomentar" : "Hanya Melihat"}
                        </span>
                        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-medium">
                          {access.canViewFinancials
                            ? "Finansial Terlihat"
                            : "Finansial Disembunyikan"}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {access.expiresAt
                          ? `Berlaku hingga ${formatDateTime(access.expiresAt)}`
                          : "Akses permanen"}
                        {access.lastUsedAt
                          ? ` · Terakhir dibuka ${formatRelative(access.lastUsedAt)}`
                          : " · Belum pernah dibuka"}
                      </p>
                    </div>

                    <AccessActions
                      projectId={projectId}
                      access={access}
                      client={client}
                      projectName={projectName}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
