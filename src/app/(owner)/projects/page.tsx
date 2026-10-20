import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ArrowLeft, FolderKanban, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/project-card";
import { ProjectFilters } from "@/components/project-filters";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getClientsForOwner, getProjectsForOwner } from "@/lib/queries";

export const metadata: Metadata = { title: "Daftar Project" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    archived?: string;
    client?: string;
  }>;
}) {
  const session = await requireOwner();
  const params = await searchParams;
  const db = await getDb();
  const archived = params.archived === "1";

  const [projects, clientsList] = await Promise.all([
    getProjectsForOwner(db, session.user.id, {
      query: params.q,
      status: params.status,
      archived,
      clientId: params.client,
    }),
    getClientsForOwner(db, session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={archived ? "Arsip Project" : "Semua Project"}
        description={
          archived
            ? "Project yang telah diselesaikan atau disimpan untuk dokumentasi historis studio."
            : "Kelola semua kontrak pekerjaan freelance, pantau progress pengerjaan, dan status sisa tagihan."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="h-10 gap-2 rounded-xl font-medium shadow-2xs">
              <Link href={archived ? "/projects" : "/projects?archived=1"}>
                {archived ? (
                  <>
                    <ArrowLeft className="size-4" />
                    <span>Project Aktif</span>
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    <span>Lihat Arsip</span>
                  </>
                )}
              </Link>
            </Button>
            {!archived ? (
              <Button asChild className="h-10 gap-2 rounded-xl font-medium shadow-xs">
                <Link href="/projects/new">
                  <Plus className="size-4" />
                  <span>Project Baru</span>
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <ProjectFilters
        query={params.q}
        status={params.status}
        archived={archived}
        clientId={params.client}
        clientsList={clientsList.map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company,
        }))}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={archived ? "Tidak ada project di arsip" : "Tidak ada project yang cocok"}
          description={
            archived
              ? "Project yang diarsipkan akan tersimpan rapi di sini tanpa mengganggu dashboard aktif."
              : params.q || params.status
                ? "Coba sesuaikan kata kunci pencarian atau reset filter untuk melihat project lainnya."
                : "Mulai perjalanan studio Anda dengan menambahkan project pertama."
          }
          action={
            archived ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/projects">Kembali ke Project Aktif</Link>
              </Button>
            ) : (
              <Button asChild className="rounded-xl shadow-xs">
                <Link href="/projects/new">Buat Project Baru</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              client={project.client}
              paid={project.paid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
