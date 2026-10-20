import { ALLOWED_FILE_TYPES, BLOCKED_EXTENSIONS } from "./constants";

export function safeFilename(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\\/]+/g, "-")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return cleaned || "file";
}

export function fileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

export function isAllowedFile(name: string, contentType: string) {
  if (BLOCKED_EXTENSIONS.has(fileExtension(name))) return false;
  if (contentType && ALLOWED_FILE_TYPES.has(contentType)) return true;
  return contentType === "application/octet-stream" && !BLOCKED_EXTENSIONS.has(fileExtension(name));
}

export function buildObjectKey(projectId: string, filename: string) {
  return `projects/${projectId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFilename(filename)}`;
}

export function objectKeyFromRequest(projectId: string, filename: string) {
  return buildObjectKey(projectId, filename);
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function matchesFileSignature(bytes: Uint8Array, contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    case "image/avif":
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    case "application/pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
    case "application/zip":
    case "application/x-zip-compressed":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.ms-powerpoint":
      return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0]);
    case "video/mp4":
      return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    case "video/webm":
      return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
    case "text/plain":
    case "text/csv":
      return !bytes.slice(0, 512).includes(0);
    default:
      return false;
  }
}
