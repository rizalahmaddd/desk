import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

export async function getCloudflareEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export type Database = Awaited<ReturnType<typeof getDb>>;
