import type { Database } from "./db";
import { activityLog, notifications } from "./db/schema";
import { newId } from "./ids";

type ActivityInput = {
  projectId: string;
  actorType?: "owner" | "client" | "system";
  actorId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(db: Database, input: ActivityInput) {
  await db.insert(activityLog).values({
    id: newId(),
    projectId: input.projectId,
    actorType: input.actorType ?? "system",
    actorId: input.actorId ?? null,
    action: input.action,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

type NotificationInput = {
  recipientType: "owner" | "client";
  recipientId: string;
  type: string;
  payload?: Record<string, unknown>;
};

export async function createNotification(
  db: Database,
  input: NotificationInput,
) {
  await db.insert(notifications).values({
    id: newId(),
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    type: input.type,
    payload: input.payload ? JSON.stringify(input.payload) : null,
  });
}
