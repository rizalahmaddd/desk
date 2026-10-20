import { ulid } from "ulid";

export function newId() {
  return ulid();
}

export function newProjectCode() {
  return `PRJ-${ulid().slice(-6)}`;
}

export function newInvoiceNo(currency: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `INV-${currency}-${date}-${ulid().slice(-5)}`;
}

export function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
