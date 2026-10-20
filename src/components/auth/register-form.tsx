"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sesuai.");
      return;
    }

    setLoading(true);
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/start",
    });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Gagal membuat akun.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-300" />
          <AlertDescription className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
            Akun studio Anda berhasil didaftarkan. Tautan verifikasi telah dikirimkan ke{" "}
            <strong>{email}</strong>. Buka tautan tersebut untuk mengaktifkan akun.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="h-11 w-full rounded-xl font-medium">
          <Link href="/login">Kembali ke Halaman Masuk</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Mulai Bersama Desk
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Daftarkan studio Anda dan buat portal kolaborasi client pertama.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-semibold">Nama Lengkap / Studio</Label>
          <Input
            id="name"
            className="h-11 rounded-xl text-sm"
            autoComplete="name"
            placeholder="Contoh: Alex Pratama"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold">Alamat Email</Label>
          <Input
            id="email"
            type="email"
            className="h-11 rounded-xl text-sm"
            autoComplete="email"
            placeholder="alex@studio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-semibold">Kata Sandi</Label>
          <Input
            id="password"
            type="password"
            className="h-11 rounded-xl text-sm"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-xs font-semibold">Konfirmasi Kata Sandi</Label>
          <Input
            id="confirm"
            type="password"
            className="h-11 rounded-xl text-sm"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi di atas"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </div>

        <Button type="submit" className="h-11 w-full gap-2 rounded-xl font-medium shadow-xs" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          <span>Buat Akun Gratis</span>
        </Button>

        <p className="pt-2 text-center text-xs sm:text-sm text-muted-foreground">
          Sudah memiliki akun?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Masuk sekarang
          </Link>
        </p>
      </form>
    </div>
  );
}
