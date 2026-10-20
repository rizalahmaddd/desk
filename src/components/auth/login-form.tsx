"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "magic" | null>(null);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading("password");
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/start",
    });
    setLoading(null);
    if (result.error) {
      setError(result.error.message ?? "Gagal masuk. Periksa kembali email dan password Anda.");
      return;
    }
    router.push("/start");
    router.refresh();
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading("magic");
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: "/start",
    });
    setLoading(null);
    if (result.error) {
      setError(result.error.message ?? "Gagal mengirimkan magic link.");
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="space-y-4">
        <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10">
          <Mail className="size-4 text-emerald-700 dark:text-emerald-300" />
          <AlertDescription className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
            Tautan masuk cepat telah dikirim ke <strong>{email}</strong>. Periksa kotak masuk Anda dalam 15 menit ke depan.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="h-11 w-full rounded-xl font-medium"
          onClick={() => setMagicSent(false)}
        >
          Kembali ke Form Masuk
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Masuk ke Desk
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Kelola seluruh project studio dan portal client Anda.
        </p>
      </div>

      <form onSubmit={submitPassword} className="space-y-4">
        {error ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold">Alamat Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@studio.com"
            className="h-11 rounded-xl text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold">Kata Sandi</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Lupa sandi?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Minimal 8 karakter"
            className="h-11 rounded-xl text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full gap-2 rounded-xl font-medium shadow-xs"
          disabled={loading !== null}
        >
          {loading === "password" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LockKeyhole className="size-4" />
          )}
          <span>Masuk ke Dashboard</span>
        </Button>

        <div className="relative py-1 text-center">
          <span className="absolute inset-x-0 top-1/2 h-px bg-border/80" />
          <span className="relative bg-card px-3 text-xs text-muted-foreground">
            atau gunakan email langsung
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl font-medium shadow-2xs"
          disabled={loading !== null || !email}
          onClick={sendMagicLink}
        >
          {loading === "magic" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          <span>Kirim Tautan Masuk Cepat</span>
        </Button>

        <p className="pt-2 text-center text-xs sm:text-sm text-muted-foreground">
          Belum memiliki akun?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Daftar gratis
          </Link>
        </p>
      </form>
    </div>
  );
}
