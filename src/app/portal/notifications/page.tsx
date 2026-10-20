import Link from "next/link";
import { Bell, CheckCircle2, CreditCard, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PortalNotificationsActions } from "@/components/portal-notifications-actions";
import { Badge } from "@/components/ui/badge";
import { requireShare } from "@/lib/share";
import { getDb } from "@/lib/db";
import { getClientNotifications } from "@/lib/queries";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function iconFor(type: string) {
  if (type.startsWith("payment")) return CreditCard;
  if (type.includes("comment")) return MessageSquare;
  return CheckCircle2;
}

export default async function PortalNotificationsPage() {
  const context = await requireShare();
  const clientId = context.access.clientId;

  if (!clientId) {
    return (
      <EmptyState
        icon={Bell}
        title="Notifikasi tidak tersedia"
        description="Akses ini tidak terhubung ke data client."
      />
    );
  }

  const db = await getDb();
  const { items, unread } = await getClientNotifications(db, clientId, context.project.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} belum dibaca.` : "Semua sudah dibaca."}
          </p>
        </div>
        <PortalNotificationsActions disabled={unread === 0} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Belum ada notifikasi"
          description="Update project, komentar, dan status pembayaran akan muncul di sini."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="divide-y">
            {items.map((item) => {
              const Icon = iconFor(item.type);
              const payload = item.payload as {
                title?: string;
                message?: string;
              };
              return (
                // Plain anchor: the target route marks the item read, and a full load refreshes the header badge.
                <a
                  key={item.id}
                  href={`/portal/notifications/${item.id}`}
                  className={cn(
                    "flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30",
                    !item.readAt && "bg-primary/5",
                  )}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">
                        {payload.title ?? "Notifikasi"}
                      </p>
                      {!item.readAt ? (
                        <Badge className="h-4 px-1 text-[9px]">Baru</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payload.message ?? ""}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelative(item.createdAt)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <Link
        href="/portal"
        className="text-sm font-medium text-primary hover:underline"
      >
        Kembali ke ringkasan
      </Link>
    </div>
  );
}
