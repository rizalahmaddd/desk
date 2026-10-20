import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function handler(request: Request) {
  const auth = await getAuth();
  return auth.handler(request);
}

export const GET = handler;
export const POST = handler;
