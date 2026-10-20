import { AppShell } from "@/components/app-shell";
import { getDb } from "@/lib/db";
import {
  getSearchItemsForOwner,
  getSharedProjectsForUser,
  getUnreadNotifications,
} from "@/lib/queries";
import { requireOwner } from "@/lib/session";

export default async function OwnerLayout({ children }: LayoutProps<"/">) {
  const session = await requireOwner();
  const db = await getDb();
  const [{ unread }, searchItems, shared] = await Promise.all([
    getUnreadNotifications(db, session.user.id),
    getSearchItemsForOwner(db, session.user.id),
    getSharedProjectsForUser(db, session.user.id),
  ]);

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      unreadCount={unread}
      sharedCount={shared.length}
      searchItems={searchItems}
    >
      {children}
    </AppShell>
  );
}
