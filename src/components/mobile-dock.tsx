"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PROJECT_TABS } from "@/components/project-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };

const PRIMARY_PROJECT_TABS = ["", "milestones", "payments"];

function countLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function DockButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const className = cn(
    "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-all duration-150 active:scale-95",
    active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
  );
  const content = (
    <>
      <span className="relative">
        <Icon className="size-5" />
        {item.badge ? (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white ring-2 ring-background">
            {countLabel(item.badge)}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate">{item.label}</span>
      {active ? <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-primary" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-haspopup="dialog">
        {content}
      </button>
    );
  }
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}

function SheetGrid({
  title,
  items,
  isActive,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center text-xs font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/80 bg-card text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="leading-tight">{item.label}</span>
              {item.badge ? (
                <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {countLabel(item.badge)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function MobileDock({
  unreadCount,
  sharedCount,
}: {
  unreadCount: number;
  sharedCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch && projectMatch[1] !== "new" ? projectMatch[1] : null;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (projectId && href === `/projects/${projectId}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const studioItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Project", icon: FolderKanban },
    { href: "/notifications", label: "Notifikasi", icon: Bell, badge: unreadCount },
    { href: "/clients", label: "Customer", icon: Users },
    { href: "/reports", label: "Laporan", icon: BarChart3 },
    { href: "/shared", label: "Dibagikan ke Saya", icon: Inbox, badge: sharedCount },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  let primary: NavItem[];
  let overflow: NavItem[];
  if (projectId) {
    const base = `/projects/${projectId}`;
    const tabs = PROJECT_TABS.map((tab) => ({
      href: tab.segment ? `${base}/${tab.segment}` : base,
      label: tab.label,
      icon: tab.icon,
      segment: tab.segment,
    }));
    primary = tabs.filter((tab) => PRIMARY_PROJECT_TABS.includes(tab.segment));
    overflow = tabs.filter((tab) => !PRIMARY_PROJECT_TABS.includes(tab.segment));
  } else {
    primary = studioItems.slice(0, 3);
    overflow = studioItems.slice(3);
  }

  // When the open page lives in the sheet, the "more" button stands in for it so the user keeps their bearings.
  const activeOverflow = overflow.find((item) => isActive(item.href));
  const moreItem: NavItem = activeOverflow
    ? { ...activeOverflow, badge: undefined }
    : { href: "#more", label: "Lainnya", icon: LayoutGrid };

  const close = () => setOpen(false);

  return (
    <>
      <nav
        aria-label={projectId ? "Navigasi project" : "Navigasi utama"}
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background shadow-[0_-4px_16px_-8px_rgb(0_0_0/0.12)] lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-md items-center gap-1 px-2">
          {primary.map((item) => (
            <DockButton key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <DockButton item={moreItem} active={Boolean(activeOverflow) || open} onClick={() => setOpen(true)} />
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-3xl pb-safe lg:hidden">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/25" aria-hidden="true" />
          <SheetHeader className="pb-2">
            <SheetTitle>{projectId ? "Menu Project" : "Menu Lainnya"}</SheetTitle>
            <SheetDescription className="sr-only">
              {projectId ? "Tab project lainnya dan menu utama" : "Semua menu workspace"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-6">
            {projectId ? (
              <>
                <SheetGrid title="Project ini" items={overflow} isActive={isActive} onNavigate={close} />
                <Button asChild variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl">
                  <Link href="/projects" onClick={close}>
                    <ArrowLeft className="size-4" />
                    Semua Project
                  </Link>
                </Button>
                <SheetGrid title="Menu utama" items={studioItems} isActive={isActive} onNavigate={close} />
              </>
            ) : (
              <>
                <SheetGrid title="Workspace" items={overflow} isActive={isActive} onNavigate={close} />
                <Button asChild className="h-11 w-full gap-2 rounded-xl">
                  <Link href="/projects/new" onClick={close}>
                    <Plus className="size-4" />
                    Project Baru
                  </Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
