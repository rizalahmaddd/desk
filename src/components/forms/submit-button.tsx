"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText = "Menyimpan...",
  className,
  variant,
  size,
  pending: pendingProp,
  disabled,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  pending?: boolean;
  disabled?: boolean;
} & VariantProps<typeof buttonVariants>) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <Button
      type="submit"
      className={className}
      variant={variant}
      size={size}
      disabled={pending || disabled}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
