"use client";

import { useState } from "react";
import { UserPlus, Users, Pencil } from "lucide-react";
import type { Client } from "@/lib/db/schema";
import { createClientAction, updateClientAction } from "@/app/actions/clients";
import { ClientForm } from "@/components/forms/client-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ClientDialog({
  client,
  trigger,
}: {
  client?: Client | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(client);

  const action = isEdit && client
    ? updateClientAction.bind(null, client.id)
    : createClientAction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : isEdit ? (
          <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs">
            <Pencil className="size-3.5" />
            <span>Edit Customer</span>
          </Button>
        ) : (
          <Button className="h-10 gap-2 rounded-xl font-medium shadow-xs">
            <UserPlus className="size-4" />
            <span>Tambah Customer</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </span>
            <DialogTitle className="font-heading text-lg font-bold">
              {isEdit ? "Edit Informasi Customer" : "Tambah Customer Baru"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? "Perbarui kontak, instansi/perusahaan, dan nomor telepon customer ini."
              : "Simpan data kontak klien untuk memudahkan pengelompokan project dan riwayat kontrak."}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <ClientForm
            action={action}
            client={client}
            submitLabel={isEdit ? "Simpan Perubahan" : "Tambah Customer"}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
