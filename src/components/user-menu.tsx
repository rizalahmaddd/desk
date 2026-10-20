"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, LogOut, Settings, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({
  name,
  email,
  sharedCount = 0,
}: {
  name: string;
  email: string;
  sharedCount?: number;
}) {
  const router = useRouter();

  async function signOut() {
    // End the portal share session too, so the next person on this device can't reopen it.
    await fetch("/api/share/logout", { redirect: "manual" }).catch(() => {});
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-[11px]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">
            {name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">{name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/shared">
            <Inbox className="size-4" />
            <span className="flex-1">Dibagikan ke Saya</span>
            {sharedCount > 0 ? (
              <span className="text-xs font-semibold text-muted-foreground">{sharedCount}</span>
            ) : null}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">
            <Settings className="size-4" />
            Pengaturan
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings/profile">
            <UserRound className="size-4" />
            Profil
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} variant="destructive">
          <LogOut className="size-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
