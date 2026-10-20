import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Share2, Settings, UserRound } from "lucide-react";
import { ProjectNav } from "@/components/project-nav";
import { ProjectStatusBadge } from "@/components/status-badge";
import { UrgencyBadge } from "@/components/urgency-badge";
import { ProjectSummaryShare } from "@/components/project-summary-share";
import { DuplicateProjectDialog } from "@/components/duplicate-project-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireOwner } from "@/lib/session";
import { getCloudflareEnv, getDb } from "@/lib/db";
import {
  getClientsForOwner,
  getMilestones,
  getProjectAccessList,
  getProjectForOwner,
} from "@/lib/queries";
import { formatDate, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const [row, milestones, accesses, clientsList] = await Promise.all([
    getProjectForOwner(db, session.user.id, id),
    getMilestones(db, id),
    getProjectAccessList(db, id),
    getClientsForOwner(db, session.user.id),
  ]);

  if (!row) notFound();

  const { project, client } = row;
  const overdue = isOverdue(project.dueDate) && project.status === "active";
  const clientInitial = client?.name ? client.name.charAt(0).toUpperCase() : "C";

  const currentMilestone =
    milestones.find((m) => m.status === "in_progress")?.title ??
    milestones.find((m) => m.status !== "done")?.title ??
    null;

  const activeAccess = accesses.find(
    (a) => !a.access.revokedAt && a.access.token,
  );
  const { APP_URL } = await getCloudflareEnv();
  const portalUrl = activeAccess?.access.token
    ? `${APP_URL}/s/${activeAccess.access.token}`
    : null;

  return (
    <div className="space-y-6">
      {/* Studio Project Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <UrgencyBadge
                dueDate={project.dueDate}
                isCompleted={project.status === "completed"}
              />
              <span className="rounded-md border border-border/60 bg-muted/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                {project.code}
              </span>
            </div>

            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 font-medium text-foreground">
                <span className="flex size-4.5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {client ? clientInitial : <UserRound className="size-2.5" />}
                </span>
                {client?.name ?? "Tanpa client"}
                {client?.company ? ` · ${client.company}` : ""}
              </span>

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1",
                  overdue
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold"
                    : "text-muted-foreground",
                )}
              >
                <CalendarDays className="size-3.5" />
                {project.dueDate
                  ? `${overdue ? "Lewat deadline: " : "Deadline: "} ${formatDate(project.dueDate)}`
                  : "Tanpa deadline"}
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ProjectSummaryShare
              projectName={project.name}
              progressPercent={project.progressPercent}
              currentMilestone={currentMilestone}
              dueDate={project.dueDate}
              clientName={client?.name}
              clientPhone={client?.phone}
              portalUrl={portalUrl}
            />

            <DuplicateProjectDialog
              projectId={project.id}
              projectName={project.name}
              clients={clientsList}
              currentClientId={project.clientId}
              label="Duplikat"
            />

            <Button asChild className="h-10 gap-2 rounded-xl font-medium shadow-xs">
              <Link href={`/projects/${project.id}/access`}>
                <Share2 className="size-4" />
                <span>Bagikan Portal</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 gap-2 rounded-xl font-medium shadow-2xs"
            >
              <Link href={`/projects/${project.id}/settings`}>
                <Settings className="size-4" />
                <span className="hidden sm:inline">Pengaturan</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Integrated Progress Bar in Header */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-muted-foreground">Progress Keseluruhan</span>
            <span className="font-heading font-bold text-foreground tabular-nums">
              {project.progressPercent}%
            </span>
          </div>
          <Progress value={project.progressPercent} className="h-2 bg-muted/70" />
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <ProjectNav projectId={project.id} />

      {/* Tab Page Content */}
      <div className="min-h-[400px]">{children}</div>
    </div>
  );
}
