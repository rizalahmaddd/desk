import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getOwnerSession();
  redirect(session ? "/start" : "/login");
}
