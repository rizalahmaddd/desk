"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
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

export function ClientDeleteButton({
  clientId,
  clientName,
  redirectTo = "/clients",
}: {
  clientId: string;
  clientName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await deleteClientAction(clientId);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(res?.success ?? "Customer berhasil dihapus.");
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/20"
          disabled={loading}
        >
          <Trash2 className="size-3.5" />
          <span>Hapus</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Customer “{clientName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Data customer ini akan dihapus dari daftar aktif. Seluruh project yang terhubung tetap tersimpan dalam sistem.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Hapus Customer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
