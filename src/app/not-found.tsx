import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Compass className="size-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
              <p className="text-sm text-muted-foreground">
                Halaman yang Anda cari tidak ada atau sudah dipindahkan.
              </p>
            </div>
            <Button asChild className="h-11 w-full">
              <Link href="/dashboard">Kembali ke dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
