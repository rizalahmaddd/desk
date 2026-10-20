"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

export function NotificationsActions({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="h-9 gap-2"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsReadAction();
          if (result?.error) toast.error(result.error);
          else toast.success(result?.success ?? "Ditandai terbaca.");
        })
      }
    >
      <CheckCheck className="size-3.5" />
      Tandai semua terbaca
    </Button>
  );
}
