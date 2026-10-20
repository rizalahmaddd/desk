import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getComprehensiveStudioReport } from "@/lib/queries";
import { StudioReportsDashboard } from "@/components/studio-reports-dashboard";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await requireOwner();
  const db = await getDb();
  const reportData = await getComprehensiveStudioReport(db, session.user.id);

  return (
    <StudioReportsDashboard
      data={reportData}
      userName={session.user.name}
      userEmail={session.user.email}
    />
  );
}
