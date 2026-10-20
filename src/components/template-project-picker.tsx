"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Layers, Loader2, Sparkles } from "lucide-react";
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

export function TemplateProjectPicker({
  projects,
  clients,
}: {
  projects: { id: string; name: string; code: string }[];
  clients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects[0]?.id ?? "",
  );
  const selectedProj = projects.find((p) => p.id === selectedProjectId);
  const [name, setName] = useState(
    selectedProj ? `${selectedProj.name} (Baru)` : "",
  );
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSelectProject(projId: string) {
    setSelectedProjectId(projId);
    const p = projects.find((x) => x.id === projId);
    if (p) {
      setName(`${p.name} (Baru)`);
    }
  }

  function handleDuplicate() {
    if (!selectedProjectId) {
      toast.error("Pilih project template terlebih dahulu.");
      return;
    }
    if (!name.trim()) {
      toast.error("Nama project baru wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await duplicateProjectAction(selectedProjectId, {
        customName: name,
        clientId: clientId || null,
      });

      if (res.error) {
        toast.error(res.error);
      } else if (res.newProjectId) {
        toast.success(res.success ?? "Project berhasil dibuat dari template!");
        setOpen(false);
        router.push(`/projects/${res.newProjectId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl font-medium border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 shadow-2xs"
        >
          <Layers className="size-3.5" />
          <span>Pilih dari Template</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <Sparkles className="size-5 text-primary" />
            <span>Mulai dari Template Proyek</span>
          </DialogTitle>
          <DialogDescription>
            Pilih proyek sebelumnya yang memiliki alur pengerjaan serupa. Seluruh milestone dan termin penagihan akan disalin otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="template-picker" className="text-xs font-semibold">
              Pilih Proyek Sumber
            </Label>
            <NativeSelect
              id="template-picker"
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="h-10 rounded-xl"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-name" className="text-xs font-semibold">
              Nama Proyek Baru
            </Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Website Fashion Rental Baru"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-client" className="text-xs font-semibold">
              Pilih Customer (Opsional)
            </Label>
            <NativeSelect
              id="template-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-10 rounded-xl"
            >
              <option value="">Tanpa Customer / Tetapkan Nanti</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
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
                <span>Membuat Project...</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Salin & Buat Project</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
