import { describe, expect, it } from "vitest";
import {
  fileExtension,
  isAllowedFile,
  matchesFileSignature,
  safeFilename,
} from "./files";

describe("safeFilename", () => {
  it("removes path traversal and unsafe characters", () => {
    expect(safeFilename("../../etc/passwd")).toBe("etc-passwd");
  });

  it("keeps spaces as dashes", () => {
    expect(safeFilename("Desain Final.png")).toBe("Desain-Final.png");
  });

  it("falls back to file when empty", () => {
    expect(safeFilename("***")).toBe("file");
  });
});

describe("fileExtension", () => {
  it("returns lowercase extension", () => {
    expect(fileExtension("Foto.JPG")).toBe("jpg");
  });

  it("returns empty when no extension", () => {
    expect(fileExtension("README")).toBe("");
  });
});

describe("isAllowedFile", () => {
  it("allows images", () => {
    expect(isAllowedFile("foto.png", "image/png")).toBe(true);
  });

  it("blocks executables regardless of MIME", () => {
    expect(isAllowedFile("setup.exe", "image/png")).toBe(false);
  });

  it("blocks html", () => {
    expect(isAllowedFile("index.html", "text/html")).toBe(false);
  });
});

describe("matchesFileSignature", () => {
  it("accepts a PNG signature", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(matchesFileSignature(bytes, "image/png")).toBe(true);
  });

  it("rejects a mismatched MIME", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    expect(matchesFileSignature(bytes, "image/png")).toBe(false);
  });

  it("accepts PDF", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(matchesFileSignature(bytes, "application/pdf")).toBe(true);
  });
});
