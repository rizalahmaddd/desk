"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  CreditCard,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PROJECT_TABS = [
  { segment: "", label: "Ringkasan", icon: LayoutDashboard },
  { segment: "timeline", label: "Timeline", icon: CalendarRange },
  { segment: "milestones", label: "Progress", icon: ListChecks },
  { segment: "payments", label: "Pembayaran", icon: CreditCard },
  { segment: "files", label: "File", icon: FolderOpen },
  { segment: "comments", label: "Diskusi", icon: MessageSquare },
  { segment: "access", label: "Akses", icon: KeyRound },
  { segment: "settings", label: "Pengaturan", icon: Settings },
];

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  // On phones the bottom dock carries these tabs instead.
  return (
    <div className="relative mb-6 hidden lg:block">
      <div className="mask-fade-x sm:mask-none flex overflow-x-auto p-1.5 scrollbar-none rounded-2xl border border-border/80 bg-muted/40 backdrop-blur-xs">
        <div className="flex items-center gap-1 px-1">
          {PROJECT_TABS.map((tab) => {
            const href = tab.segment ? `${base}/${tab.segment}` : base;
            const active = tab.segment
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === base;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.segment}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all duration-200 select-none",
                  active
                    ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                    : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="whitespace-nowrap">{tab.label}</span>
                {active ? (
                  <span className="sr-only">(Aktif)</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
