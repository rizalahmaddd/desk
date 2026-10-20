"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Gagal mengirim email reset.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert className="rounded-xl border-border/80 bg-muted/40">
          <MailCheck className="size-4 text-primary" />
          <AlertDescription>
            Jika email terdaftar, tautan reset password sudah dikirim ke{" "}
            <strong>{email}</strong>.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="h-11 w-full rounded-xl font-medium">
          <Link href="/login">Kembali ke halaman masuk</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          className="h-11 rounded-xl bg-background/60 focus-visible:ring-primary/30"
          autoComplete="email"
          placeholder="anda@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <Button
        type="submit"
        className="h-11 w-full gap-2 rounded-xl font-medium shadow-xs shadow-primary/20"
        disabled={loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Kirim tautan reset
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Ingat password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
