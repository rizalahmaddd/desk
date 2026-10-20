"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Tautan reset tidak valid atau sudah kedaluwarsa.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Gagal mengatur ulang password.");
      return;
    }
    router.push("/login");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Password baru
        </Label>
        <Input
          id="password"
          type="password"
          className="h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Konfirmasi password
        </Label>
        <Input
          id="confirm"
          type="password"
          className="h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30"
          autoComplete="new-password"
          placeholder="Ulangi password baru"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
      </div>
      <Button
        type="submit"
        className="h-11 w-full gap-2 rounded-xl font-medium shadow-xs shadow-primary/20"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Simpan password
      </Button>
    </form>
  );
}
