"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { duplicateProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function DuplicateProjectDialog({
  projectId,
  projectName,
  clients = [],
  currentClientId,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
  label = "Duplikat Proyek",
}: {
  projectId: string;
  projectName: string;
  clients?: { id: string; name: string }[];
  currentClientId?: string | null;
  triggerVariant?: "outline" | "default" | "ghost" | "secondary";
  triggerSize?: "sm" | "default" | "lg" | "icon";
  triggerClassName?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${projectName} (Salinan)`);
  const [clientId, setClientId] = useState(currentClientId ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDuplicate() {
    if (!name.trim()) {
      toast.error("Nama project baru tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const res = await duplicateProjectAction(projectId, {
        customName: name,
        clientId: clientId || null,
      });

      if (res.error) {
        toast.error(res.error);
      } else if (res.newProjectId) {
        toast.success(res.success ?? "Project berhasil diduplikat!");
        setOpen(false);
        router.push(`/projects/${res.newProjectId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          aria-label={label}
        >
          <Copy className="size-3.5" />
          <span>{label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <Layers className="size-5 text-primary" />
            <span>Duplikat sebagai Template</span>
          </DialogTitle>
          <DialogDescription>
            Menyalin struktur milestone, bobot, dan jadwal termin pembayaran dari project ini ke project baru dengan status awal bersih.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Project Sumber
            </span>
            <p className="font-medium text-foreground">{projectName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dup-name" className="text-xs font-semibold">
              Nama Project Baru
            </Label>
            <Input
              id="dup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Website Rental Mobil (Paket Complete)"
              className="h-10 rounded-xl"
            />
          </div>

          {clients.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="dup-client" className="text-xs font-semibold">
                Customer untuk Project Ini
              </Label>
              <NativeSelect
                id="dup-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="h-10 rounded-xl"
              >
                <option value="">Gunakan Customer yang Sama / Tetapkan Nanti</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button
            className="gap-2 rounded-xl"
            onClick={handleDuplicate}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Menduplikasi...</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Duplikat & Mulai Kerja</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
