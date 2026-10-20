import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Lupa password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Lupa password
        </h1>
        <p className="text-sm text-muted-foreground">
          Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang password.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
