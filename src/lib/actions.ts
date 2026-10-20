import type { ZodError } from "zod";

export type ActionState = {
  error?: string;
  success?: string;
  url?: string;
  id?: string;
} | null;

export function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function firstError(error: ZodError) {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

export function formValues(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
