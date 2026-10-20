"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/portal", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/portal/progress", label: "Progress", icon: ListChecks },
  { href: "/portal/payments", label: "Pembayaran", icon: CreditCard },
  { href: "/portal/files", label: "File", icon: FolderOpen },
  { href: "/portal/comments", label: "Diskusi", icon: MessageSquare },
];

export function PortalNav() {
  const pathname = usePathname();

  function active(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Desktop & Tablet Segmented Track */}
      <div className="hidden border-b border-border/80 bg-background/80 backdrop-blur-md md:block">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2.5">
          <nav className="inline-flex items-center gap-1 rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-2xs">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = active(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-[38px] items-center gap-2 rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 select-none",
                    isActive
                      ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                      : "text-muted-foreground hover:bg-card/40 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 glass-dock md:hidden shadow-lg">
        <div className="flex h-16 items-center justify-around px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium transition-all duration-150 active:scale-95",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {isActive ? (
                  <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
