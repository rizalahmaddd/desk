import type { Metadata } from "next";
import { Bell, CheckCircle2, CreditCard, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { NotificationsActions } from "@/components/notifications-actions";
import { requireOwner } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getUnreadNotifications } from "@/lib/queries";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifikasi Studio" };
export const dynamic = "force-dynamic";

function iconFor(type: string) {
  if (type.startsWith("payment")) return CreditCard;
  if (type.includes("comment")) return MessageSquare;
  return CheckCircle2;
}

export default async function NotificationsPage() {
  const session = await requireOwner();
  const db = await getDb();
  const { items, unread } = await getUnreadNotifications(db, session.user.id);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Pusat Notifikasi"
        description={
          unread > 0
            ? `Terdapat ${unread} pesan atau aktivitas baru yang memerlukan perhatian Anda.`
            : "Semua pemberitahuan telah Anda baca."
        }
        actions={<NotificationsActions disabled={unread === 0} />}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Belum ada notifikasi baru"
          description="Aktivitas seperti konfirmasi pembayaran dari client, komentar diskusi, dan progres milestone akan terpusat di sini."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="divide-y divide-border/60">
            {items.map((item) => {
              const Icon = iconFor(item.type);
              const payload = item.payload as {
                title?: string;
                message?: string;
                projectId?: string;
              };
              const isUnread = !item.readAt;

              const content = (
                <div
                  className={cn(
                    "flex gap-3.5 p-4 sm:p-5 transition-colors",
                    isUnread ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/10",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      isUnread
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border/80 bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm", isUnread ? "font-bold text-foreground" : "font-medium text-foreground")}>
                          {payload.title ?? "Pemberitahuan Sistem"}
                        </p>
                        {isUnread ? (
                          <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                            Baru
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelative(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {payload.message ?? ""}
                    </p>
                  </div>
                </div>
              );

              return (
                // Plain anchor: the target route marks the item read, and a full load refreshes the sidebar badge.
                <a
                  key={item.id}
                  href={`/notifications/${item.id}`}
                  className="block transition-colors hover:bg-muted/20"
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
