"use client";

import { useState } from "react";
import { AlertCircle, Receipt } from "lucide-react";
import { submitPaymentClaimAction } from "@/app/actions/portal";
import { useActionForm } from "@/hooks/use-action-form";
import { PAYMENT_METHODS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NativeSelect } from "@/components/ui/native-select";
import { FileUploader } from "@/components/file-uploader";
import { SubmitButton } from "@/components/forms/submit-button";
import { todayISO } from "@/lib/dates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PaymentClaimDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<{ id: string } | null>(null);
  const { state, formAction, pending } = useActionForm(
    submitPaymentClaimAction,
    {
      onSuccess: () => {
        setOpen(false);
        setProof(null);
      },
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 gap-2 rounded-xl font-medium shadow-xs">
          <Receipt className="size-4" />
          <span>Saya Sudah Bayar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Konfirmasi Pembayaran</DialogTitle>
          <DialogDescription>
            Lampirkan bukti transfer dan nominal pembayaran Anda agar freelancer dapat memvalidasi tagihan.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {state?.error ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="size-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="claim-amount" className="text-xs font-semibold">Nominal yang Ditransfer (Rp)</Label>
            <Input
              id="claim-amount"
              name="amount"
              className="h-11 rounded-xl tabular-nums font-semibold"
              inputMode="numeric"
              placeholder="5000000"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="claim-date" className="text-xs font-semibold">Tanggal Transfer</Label>
              <Input
                id="claim-date"
                name="paidAt"
                type="date"
                className="h-11 rounded-xl"
                defaultValue={todayISO()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-method" className="text-xs font-semibold">Metode Transfer</Label>
              <NativeSelect
                id="claim-method"
                name="method"
                defaultValue="Transfer bank"
                className="h-11 rounded-xl"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-note" className="text-xs font-semibold">Catatan / No. Referensi Rekening</Label>
            <Textarea
              id="claim-note"
              name="note"
              rows={2}
              className="rounded-xl text-sm"
              placeholder="Contoh: Transfer atas nama PT Maju Bersama"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Unggah Bukti Transfer / Resi</Label>
            <FileUploader
              projectId={projectId}
              accept="image/*,application/pdf"
              maxFiles={1}
              label="Pilih foto bukti transfer"
              onUploaded={(files) => setProof(files[0] ?? null)}
            />
            {proof ? (
              <input type="hidden" name="proofAttachmentId" value={proof.id} />
            ) : null}
          </div>
          <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs" pending={pending}>
            Kirim Konfirmasi Pembayaran
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
