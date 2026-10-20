import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getOwnerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage() {
  const session = await getOwnerSession();
  if (session) redirect("/start");

  return <RegisterForm />;
}
