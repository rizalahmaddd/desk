import { and, eq, isNull, or, gt } from "drizzle-orm";
import { getDb } from "./db";
import { apiKeys, user, type User, type ApiKey } from "./db/schema";
import { getOwnerSession } from "./session";

export type AuthContext = {
  user: User;
  apiKey?: ApiKey;
  authType: "api_key" | "session";
};

export async function hashApiKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) {
      return token.trim();
    }
  }

  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader.trim();
  }

  return null;
}

export async function authenticateApiRequest(request: Request): Promise<AuthContext | null> {
  const db = await getDb();
  const token = extractBearerToken(request);

  if (token) {
    const hashed = await hashApiKey(token);
    const now = new Date();

    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, hashed),
          isNull(apiKeys.revokedAt),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
        ),
      )
      .limit(1);

    if (keyRecord) {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: now })
        .where(eq(apiKeys.id, keyRecord.id));

      const [owner] = await db
        .select()
        .from(user)
        .where(eq(user.id, keyRecord.userId))
        .limit(1);

      if (owner) {
        return { user: owner, apiKey: keyRecord, authType: "api_key" };
      }
    }

    return null;
  }

  const session = await getOwnerSession();
  if (session?.user) {
    const [owner] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (owner) {
      return { user: owner, authType: "session" };
    }
  }

  return null;
}

export function jsonResponse<T>(data: T, status = 200, init?: ResponseInit): Response {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
      ...init?.headers,
    },
  });
}

export function jsonError(
  error: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return Response.json(
    {
      success: false,
      error,
      message,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
