import { describe, expect, it } from "vitest";
import { randomToken, sha256 } from "./ids";

describe("sha256", () => {
  it("matches a known digest", async () => {
    expect(await sha256("testtoken123")).toBe(
      "a23ee81c8d37d8d57068587c0b9f0e844e76b65c324ed858b3b771b279be84c8",
    );
  });
});

describe("randomToken", () => {
  it("creates url-safe tokens", () => {
    const token = randomToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(30);
  });

  it("does not repeat", () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});
