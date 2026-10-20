import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { ApiKeysManager } from "@/components/api-keys-manager";
import { Card, CardContent } from "@/components/ui/card";
import { requireOwner } from "@/lib/session";
import { getApiKeysForUser } from "@/lib/queries";
import { getCloudflareEnv, getDb } from "@/lib/db";
import { Bot, ShieldCheck, User } from "lucide-react";

export const metadata: Metadata = { title: "Pengaturan Studio" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireOwner();
  const db = await getDb();
  const [keys, env] = await Promise.all([
    getApiKeysForUser(db, session.user.id),
    getCloudflareEnv(),
  ]);

  const appUrl = env.APP_URL;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pengaturan Akun & Studio"
        description="Kelola informasi profil, kunci API untuk asisten AI (Claude/Cursor), dan keamanan akun Anda."
      />

      <div className="grid gap-8 divide-y divide-border/60">
        {/* Section 1: Profil Studio */}
        <div className="grid gap-6 pt-6 first:pt-0 lg:grid-cols-[280px_1fr] xl:grid-cols-[340px_1fr]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="size-3.5" />
              </span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Profil Freelancer
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Nama identitas studio Anda yang akan dilihat langsung oleh client pada halaman portal proyek, tagihan, dan kuitansi.
            </p>
          </div>

          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardContent className="p-5 sm:p-6">
              <ProfileForm
                name={session.user.name}
                email={session.user.email}
              />
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Kunci API & Integrasi AI (MCP) */}
        <div className="grid gap-6 pt-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[340px_1fr]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-3.5" />
              </span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                API & Integrasi AI (MCP)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Hubungkan Desk ke Claude Desktop, Cursor, Antigravity, atau AI agent lain untuk mengelola project, milestone, dan pembayaran secara otomatis.
            </p>
          </div>

          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardContent className="p-5 sm:p-6">
              <ApiKeysManager apiKeys={keys} appUrl={appUrl} />
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Keamanan & Sandi */}
        <div className="grid gap-6 pt-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[340px_1fr]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ShieldCheck className="size-3.5" />
              </span>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Keamanan & Sandi
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Informasi proteksi kata sandi dan pengaturan otentikasi akun studio Anda.
            </p>
          </div>

          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardContent className="p-5 sm:p-6 space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Untuk memperbarui kata sandi akun, gunakan fitur lupa kata sandi pada halaman masuk. Tautan reset yang aman akan langsung dikirimkan ke email terdaftar Anda.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
