import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { PortalNav } from "@/components/portal-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireShare } from "@/lib/share";
import { getOwnerSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getClientNotifications } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Portal Client — Desk",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const context = await requireShare();
  const db = await getDb();
  const [{ unread }, ownerSession] = await Promise.all([
    context.access.clientId
      ? getClientNotifications(db, context.access.clientId, context.project.id)
      : Promise.resolve({ unread: 0 }),
    getOwnerSession(),
  ]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Client Portal Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 glass-dock">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/portal" className="shrink-0 transition-opacity hover:opacity-90">
              <Logo showText={false} size="sm" />
            </Link>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="truncate font-heading text-sm sm:text-base font-bold text-foreground">
                  {context.project.name}
                </p>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <ShieldCheck className="size-3" />
                  Portal Klien
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Klien: {context.client?.name ?? "Tamu Resmi"}
                {context.client?.company ? ` · ${context.client.company}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {ownerSession ? (
              <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 rounded-xl font-medium text-muted-foreground hover:text-foreground">
                <Link href="/shared" aria-label="Kembali ke daftar project yang dibagikan">
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">Semua Project</span>
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Notifikasi"
            >
              <Link href="/portal/notifications">
                <Bell className="size-4" />
                {unread > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-xs">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            </Button>

            <ThemeToggle />

            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs">
              <a href="/api/share/logout">
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Segmented Sub-Navigation */}
      <PortalNav />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 md:pb-12">
        {children}
      </main>
    </div>
  );
}
