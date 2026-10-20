import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOwnerSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Akses tidak tersedia",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ShareUnavailablePage() {
  const session = await getOwnerSession();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Link2Off className="size-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Akses tidak tersedia</h1>
              <p className="text-sm text-muted-foreground">
                Link ini sudah kedaluwarsa, dicabut, atau tidak valid. Hubungi
                freelancer Anda untuk mendapatkan link baru.
              </p>
            </div>
            {session ? (
              <Button asChild className="w-full rounded-xl">
                <Link href="/shared">Lihat project yang dibagikan ke saya</Link>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sudah punya akun dengan email yang diundang?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Masuk
                </Link>{" "}
                untuk melihat semua project Anda.
              </p>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Portal client Desk
        </p>
      </div>
    </div>
  );
}
