import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/forms/project-form";
import { TemplateProjectPicker } from "@/components/template-project-picker";
import { createProjectAction } from "@/app/actions/projects";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getClientsForOwner, getProjectsForOwner } from "@/lib/queries";

export const metadata: Metadata = { title: "Buat Project Baru" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireOwner();
  const params = await searchParams;
  const db = await getDb();
  const [clientsList, existingProjects] = await Promise.all([
    getClientsForOwner(db, session.user.id),
    getProjectsForOwner(db, session.user.id),
  ]);

  const preselectedClient = params.clientId
    ? clientsList.find((c) => c.id === params.clientId) || null
    : null;

  const templateOptions = existingProjects.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Buat Project Baru"
        description="Lengkapi informasi dasar pekerjaan dan nilai kontrak. Milestone serta jadwal termin dapat Anda atur secara detail setelah project terdaftar."
      />

      {templateOptions.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 shadow-2xs">
          <div className="space-y-1">
            <h4 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Gunakan Template Proyek yang Sudah Ada?</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Salin seluruh struktur milestone & termin penagihan dari proyek sebelumnya tanpa harus input dari nol.
            </p>
          </div>
          <div className="shrink-0">
            <TemplateProjectPicker
              projects={templateOptions}
              clients={clientsList.map((c) => ({ id: c.id, name: c.name }))}
            />
          </div>
        </div>
      ) : null}

      <ProjectForm
        action={createProjectAction}
        client={preselectedClient}
        clientsList={clientsList}
        submitLabel="Daftarkan Project"
      />
    </div>
  );
}
