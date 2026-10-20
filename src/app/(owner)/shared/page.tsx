import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SharedProjectCard } from "@/components/shared-project-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getSharedProjectsForUser } from "@/lib/queries";

export const metadata: Metadata = { title: "Dibagikan ke Saya" };
export const dynamic = "force-dynamic";

export default async function SharedProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ unavailable?: string }>;
}) {
  const session = await requireOwner();
  const params = await searchParams;
  const db = await getDb();
  const shared = await getSharedProjectsForUser(db, session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dibagikan ke Saya"
        description={`Project dari freelancer lain yang membagikan akses ke ${session.user.email}.`}
      />

      {params.unavailable === "1" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Akses ke project tersebut sudah dicabut, kedaluwarsa, atau project-nya dihapus.
          </AlertDescription>
        </Alert>
      ) : null}

      {!session.user.emailVerified ? (
        <Alert>
          <AlertDescription>
            Verifikasi email Anda terlebih dahulu untuk melihat project yang dibagikan ke alamat ini.
          </AlertDescription>
        </Alert>
      ) : shared.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Belum ada project yang dibagikan"
          description={`Saat freelancer membagikan project ke ${session.user.email}, project tersebut otomatis muncul di sini.`}
          action={
            <Button asChild variant="outline" className="h-10 gap-2 rounded-xl">
              <Link href="/projects/new">
                <Plus className="size-4" />
                <span>Buat project sendiri</span>
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shared.map((item) => (
            <SharedProjectCard key={item.project.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
