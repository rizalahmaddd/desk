import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getOwnerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  const session = await getOwnerSession();
  if (session) redirect("/start");

  return <LoginForm />;
}
