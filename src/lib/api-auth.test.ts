import { describe, expect, it } from "vitest";
import { extractBearerToken, hashApiKey } from "./api-auth";

describe("api-auth helpers", () => {
  it("extracts token from Authorization: Bearer header", () => {
    const req = new Request("http://localhost/api/v1/projects", {
      headers: {
        authorization: "Bearer pdk_live_1234567890abcdef",
      },
    });
    expect(extractBearerToken(req)).toBe("pdk_live_1234567890abcdef");
  });

  it("extracts token from x-api-key header", () => {
    const req = new Request("http://localhost/api/v1/projects", {
      headers: {
        "x-api-key": "pdk_live_customkey",
      },
    });
    expect(extractBearerToken(req)).toBe("pdk_live_customkey");
  });

  it("returns null when no auth header is present", () => {
    const req = new Request("http://localhost/api/v1/projects");
    expect(extractBearerToken(req)).toBeNull();
  });

  it("hashes API keys consistently with SHA-256", async () => {
    const key = "pdk_live_test_key_12345";
    const hash1 = await hashApiKey(key);
    const hash2 = await hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});
