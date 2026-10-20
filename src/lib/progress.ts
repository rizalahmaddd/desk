import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "./db";
import { milestones, projects } from "./db/schema";

export async function recalcProjectProgress(db: Database, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project || project.progressMode !== "auto") return;

  const rows = await db
    .select({ weight: milestones.weight, status: milestones.status })
    .from(milestones)
    .where(
      and(eq(milestones.projectId, projectId), isNull(milestones.deletedAt)),
    );

  const totalWeight = rows.reduce((total, row) => total + row.weight, 0);
  const doneWeight = rows
    .filter((row) => row.status === "done")
    .reduce((total, row) => total + row.weight, 0);
  const percent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;

  await db
    .update(projects)
    .set({ progressPercent: percent })
    .where(eq(projects.id, projectId));
}
