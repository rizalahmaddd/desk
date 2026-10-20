import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";

export async function getOwnerSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

export async function requireOwner() {
  const session = await getOwnerSession();
  if (!session) redirect("/login");
  return session;
}
