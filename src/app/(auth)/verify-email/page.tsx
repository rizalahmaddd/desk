import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verifikasi email" };

export default function VerifyEmailPage() {
  return (
    <Card className="rounded-2xl border-border/80 bg-card/60 shadow-xs backdrop-blur-xs">
      <CardContent className="space-y-5 p-7 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
          <MailCheck className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Cek email Anda
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kami sudah mengirim tautan verifikasi. Setelah email diverifikasi,
            Anda bisa langsung masuk ke dashboard studio Anda.
          </p>
        </div>
        <Button asChild className="h-11 w-full rounded-xl font-medium shadow-xs shadow-primary/20">
          <Link href="/login">Ke halaman masuk</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
