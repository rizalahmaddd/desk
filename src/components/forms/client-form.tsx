"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Building2, Mail, Phone, User } from "lucide-react";
import type { Client } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/forms/submit-button";

export function ClientForm({
  action,
  client,
  submitLabel = "Simpan Customer",
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  client?: Client | null;
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (state?.success && onSuccess) {
      const timer = setTimeout(() => {
        onSuccess();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
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

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-semibold">
          Nama Kontak / PIC <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            defaultValue={client?.name ?? ""}
            placeholder="Contoh: Budi Santoso"
            required
            className="h-11 rounded-xl pl-10 text-sm shadow-2xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-xs font-semibold">
          Perusahaan / Nama Usaha
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="company"
            name="company"
            defaultValue={client?.company ?? ""}
            placeholder="Contoh: PT Surya Kreasi Digital (Opsional)"
            className="h-11 rounded-xl pl-10 text-sm shadow-2xs"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">
            Email Customer
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
              placeholder="budi@perusahaan.com"
              className="h-11 rounded-xl pl-10 text-sm shadow-2xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold">
            Nomor Telepon / WhatsApp
          </Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={client?.phone ?? ""}
              placeholder="08123456789"
              className="h-11 rounded-xl pl-10 text-sm shadow-2xs"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton className="h-11 w-full rounded-xl font-medium shadow-xs">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
