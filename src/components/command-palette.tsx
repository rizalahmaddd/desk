"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Bell,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export type SearchProjectItem = {
  id: string;
  name: string;
  code: string;
  status: string;
};

export type SearchClientItem = {
  id: string;
  name: string;
  company: string | null;
};

export function CommandPalette({
  projects = [],
  clients = [],
}: {
  projects?: SearchProjectItem[];
  clients?: SearchClientItem[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function runCommand(command: () => void) {
    setOpen(false);
    startTransition(() => {
      command();
    });
  }

  return (
    <>
      {/* Desktop Quick Search Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex h-9 w-52 lg:w-60 items-center justify-between rounded-xl border-border/70 bg-muted/30 px-3 text-xs text-muted-foreground hover:border-border hover:bg-muted/50 shadow-2xs transition-all duration-150"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5 opacity-60" />
          <span>Pencarian cepat...</span>
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/80 bg-background px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Mobile Icon Trigger Button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        className="md:hidden size-9 rounded-xl text-muted-foreground hover:text-foreground"
        aria-label="Buka Pencarian"
      >
        <Search className="size-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Pencarian Cepat Desk"
        description="Cari project, customer, laporan, atau jalankan perintah cepat..."
      >
        <Command>
          <CommandInput placeholder="Ketik nama project, customer, atau aksi..." />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>Tidak ada hasil yang ditemukan.</CommandEmpty>

            {/* Quick Actions */}
            <CommandGroup heading="Aksi Cepat">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/projects/new"))}
                className="gap-2.5 cursor-pointer"
              >
                <Plus className="size-4 text-primary" />
                <span>Buat Project Baru</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/clients"))}
                className="gap-2.5 cursor-pointer"
              >
                <UserPlus className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Kelola & Tambah Customer</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/reports"))}
                className="gap-2.5 cursor-pointer"
              >
                <BarChart3 className="size-4 text-sky-600 dark:text-sky-400" />
                <span>Buka Laporan & Finansial Studio</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
                }
                className="gap-2.5 cursor-pointer"
              >
                {theme === "dark" ? (
                  <Sun className="size-4 text-amber-500" />
                ) : (
                  <Moon className="size-4 text-indigo-500" />
                )}
                <span>Ganti Tema ({theme === "dark" ? "Mode Terang" : "Mode Gelap"})</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Navigation Pages */}
            <CommandGroup heading="Navigasi Halaman">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="gap-2.5 cursor-pointer"
              >
                <LayoutDashboard className="size-4 text-muted-foreground" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/projects"))}
                className="gap-2.5 cursor-pointer"
              >
                <FolderKanban className="size-4 text-muted-foreground" />
                <span>Semua Project</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/clients"))}
                className="gap-2.5 cursor-pointer"
              >
                <Users className="size-4 text-muted-foreground" />
                <span>Daftar Customer</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/reports"))}
                className="gap-2.5 cursor-pointer"
              >
                <BarChart3 className="size-4 text-muted-foreground" />
                <span>Laporan Finansial & Velocity</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/notifications"))}
                className="gap-2.5 cursor-pointer"
              >
                <Bell className="size-4 text-muted-foreground" />
                <span>Notifikasi</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/settings"))}
                className="gap-2.5 cursor-pointer"
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Pengaturan Akun & API</span>
              </CommandItem>
            </CommandGroup>

            {/* Projects */}
            {projects.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={`Daftar Project (${projects.length})`}>
                  {projects.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.code}`}
                      onSelect={() =>
                        runCommand(() => router.push(`/projects/${p.id}`))
                      }
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FolderKanban className="size-4 shrink-0 text-primary/70" />
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({p.code})
                        </span>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {/* Clients */}
            {clients.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={`Customer Studio (${clients.length})`}>
                  {clients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.company ?? ""}`}
                      onSelect={() =>
                        runCommand(() => router.push(`/clients/${c.id}`))
                      }
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                      {c.company ? (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                          {c.company}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
