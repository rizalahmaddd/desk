"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";

export function useActionForm(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  options?: {
    onSuccess?: (state: NonNullable<ActionState>) => void;
    successMessage?: string;
  },
) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);

  async function formAction(formData: FormData) {
    setPending(true);
    try {
      const result = await action(null, formData);
      setState(result);
      if (result?.error) toast.error(result.error);
      if (result?.success) {
        toast.success(options?.successMessage ?? result.success);
        options?.onSuccess?.(result);
      }
    } finally {
      setPending(false);
    }
  }

  return { state, formAction, pending };
}
