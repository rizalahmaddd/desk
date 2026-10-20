"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
            <p className="text-sm text-muted-foreground">
              Halaman gagal dimuat. Coba muat ulang. Jika masalah berlanjut,
              hubungi dukungan.
            </p>
            {error.digest ? (
              <p className="text-[11px] text-muted-foreground">
                Kode: {error.digest}
              </p>
            ) : null}
          </div>
          <Button onClick={reset} className="h-11 w-full gap-2">
            <RotateCcw className="size-4" />
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
