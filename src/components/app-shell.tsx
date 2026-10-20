"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { CommandPalette, type SearchClientItem, type SearchProjectItem } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { MobileDock } from "@/components/mobile-dock";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Project", icon: FolderKanban },
  { href: "/clients", label: "Customer", icon: Users },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function AppShell({
  user,
  unreadCount,
  sharedCount,
  searchItems,
  children,
}: {
  user: { name: string; email: string };
  unreadCount: number;
  sharedCount: number;
  searchItems?: {
    projects: SearchProjectItem[];
    clients: SearchClientItem[];
  };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Desktop Studio Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-sidebar/95 backdrop-blur-md lg:flex">
        {/* Workspace Brand Header */}
        <div className="flex h-18 items-center px-6">
          <Link href="/dashboard" className="transition-opacity hover:opacity-90">
            <Logo size="default" />
          </Link>
        </div>

        {/* Quick Action */}
        <div className="px-4 pb-2.5">
          <Button
            asChild
            variant="outline"
            className="h-10 w-full justify-center gap-2 rounded-xl font-medium border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/40 shadow-2xs transition-all duration-200"
          >
            <Link href="/projects/new">
              <Plus className="size-4" />
              <span>Project Baru</span>
            </Link>
          </Button>
        </div>

        {/* Quick Search Palette Trigger */}
        <div className="px-4 pb-4">
          <CommandPalette
            projects={searchItems?.projects}
            clients={searchItems?.clients}
          />
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none",
                    active
                      ? "bg-primary/10 text-primary font-semibold shadow-2xs border border-primary/20"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4.5 shrink-0 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Sebagai Client
          </div>
          <nav>
            <Link
              href="/shared"
              aria-current={isActive("/shared") ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none",
                isActive("/shared")
                  ? "bg-primary/10 text-primary font-semibold shadow-2xs border border-primary/20"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Inbox
                className={cn(
                  "size-4.5 shrink-0 transition-colors",
                  isActive("/shared")
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex-1 truncate">Dibagikan ke Saya</span>
              {sharedCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-foreground">
                  {sharedCount > 99 ? "99+" : sharedCount}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>

        {/* Bottom User & Preferences */}
        <div className="border-t border-border/80 p-3 bg-sidebar/50">
          <div className="flex items-center justify-between gap-2 rounded-xl p-1.5">
            <UserMenu name={user.name} email={user.email} sharedCount={sharedCount} />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Top App Bar */}
      <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b border-border/80 bg-background/90 px-4 glass-dock lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <CommandPalette
            projects={searchItems?.projects}
            clients={searchItems?.clients}
          />
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} sharedCount={sharedCount} />
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 pb-24 lg:pl-64 lg:pb-10">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          {children}
        </div>
      </main>

      <MobileDock unreadCount={unreadCount} sharedCount={sharedCount} />
    </div>
  );
}
