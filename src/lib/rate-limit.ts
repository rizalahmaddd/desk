type RateLimitRule = { window: number; max: number };

// One upsert per request keeps the check-and-increment atomic, so parallel requests
// across Worker isolates can't all slip through on a stale count.
export function createD1RateLimitStorage(d1: CloudflareEnv["DB"]) {
  return {
    async consume(key: string, rule: RateLimitRule) {
      const now = Date.now();
      const windowMs = rule.window * 1000;
      const row = await d1
        .prepare(
          `INSERT INTO rate_limit (key, count, window_start) VALUES (?1, 1, ?2)
           ON CONFLICT(key) DO UPDATE SET
             count = CASE WHEN rate_limit.window_start <= ?2 - ?3 THEN 1 ELSE rate_limit.count + 1 END,
             window_start = CASE WHEN rate_limit.window_start <= ?2 - ?3 THEN ?2 ELSE rate_limit.window_start END
           RETURNING count, window_start`,
        )
        .bind(key, now, windowMs)
        .first<{ count: number; window_start: number }>();

      if (!row || row.count <= rule.max) return { allowed: true, retryAfter: null };
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000)),
      };
    },
  };
}
