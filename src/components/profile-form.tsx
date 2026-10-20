"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { updateProfileAction } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/forms/submit-button";

export function ProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-4 pt-1">
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

      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs font-semibold">Nama Lengkap / Identitas Studio</Label>
        <Input id="name" name="name" className="h-11 rounded-xl text-sm" defaultValue={name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-semibold">Alamat Email Terdaftar</Label>
        <Input
          id="email"
          className="h-11 rounded-xl text-sm bg-muted/40 cursor-not-allowed opacity-80"
          defaultValue={email}
          disabled
          readOnly
        />
        <p className="text-[11px] text-muted-foreground">
          Email terikat dengan identitas otentikasi akun studio Anda.
        </p>
      </div>

      <SubmitButton className="h-11 rounded-xl font-medium shadow-xs">
        Simpan Profil
      </SubmitButton>
    </form>
  );
}
