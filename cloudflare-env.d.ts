import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    FILES: R2Bucket;
    APP_URL: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_SECRET: string;
    EMAIL_FROM: string;
    RESEND_API_KEY?: string;
  }
}

export {};
