import { FilesPanel } from "@/components/files-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import {
  getAttachments,
  getOwnerStorageUsage,
  getProjectForOwner,
} from "@/lib/queries";
import { formatBytes } from "@/lib/dates";
import { OWNER_STORAGE_QUOTA_BYTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();
  const db = await getDb();
  const row = await getProjectForOwner(db, session.user.id, id);
  if (!row) return null;

  const [files, usage] = await Promise.all([
    getAttachments(db, id),
    getOwnerStorageUsage(db, session.user.id),
  ]);

  const percent = Math.min(
    Math.round((usage / OWNER_STORAGE_QUOTA_BYTES) * 100),
    100,
  );

  return (
    <div className="space-y-5">
      <Card className="shadow-none">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Penyimpanan</span>
            <span className="text-muted-foreground">
              {formatBytes(usage)} dari 10 GB
            </span>
          </div>
          <Progress value={percent} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            Kuota berlaku untuk seluruh project Anda.
          </p>
        </CardContent>
      </Card>

      <FilesPanel projectId={id} attachments={files} />
    </div>
  );
}
