import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import {
  getActivity,
  getMilestones,
  getPayments,
  getProjectForOwner,
  getUpdates,
} from "@/lib/queries";
import { ProjectTimelineView } from "@/components/project-timeline-view";

export const metadata: Metadata = { title: "Timeline Proyek" };
export const dynamic = "force-dynamic";

export default async function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);

  if (!row) notFound();

  const [milestones, updates, payments, activity] = await Promise.all([
    getMilestones(db, id),
    getUpdates(db, id, true),
    getPayments(db, id),
    getActivity(db, id, 50),
  ]);

  return (
    <ProjectTimelineView
      project={row.project}
      milestones={milestones}
      updates={updates}
      payments={payments}
      activity={activity}
    />
  );
}
