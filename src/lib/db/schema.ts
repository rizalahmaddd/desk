import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestampDefault = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(timestampDefault)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(timestampDefault)
    .notNull()
    .$onUpdate(() => new Date()),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    phone: text("phone"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("clients_owner_email_unique").on(table.ownerId, table.email),
    index("clients_owner_idx").on(table.ownerId),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["draft", "active", "on_hold", "completed", "cancelled"],
    })
      .default("active")
      .notNull(),
    currency: text("currency").default("IDR").notNull(),
    totalAmount: integer("total_amount").default(0).notNull(),
    progressMode: text("progress_mode", { enum: ["auto", "manual"] })
      .default("auto")
      .notNull(),
    progressPercent: integer("progress_percent").default(0).notNull(),
    startDate: text("start_date"),
    dueDate: text("due_date"),
    shareFinancials: integer("share_financials", { mode: "boolean" })
      .default(true)
      .notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    version: integer("version").default(1).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("projects_owner_code_unique").on(table.ownerId, table.code),
    index("projects_owner_status_idx").on(table.ownerId, table.status),
    index("projects_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("projects_client_idx").on(table.clientId),
  ],
);

export const projectAccess = sqliteTable(
  "project_access",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    scope: text("scope", { enum: ["view", "comment"] })
      .default("comment")
      .notNull(),
    canViewFinancials: integer("can_view_financials", { mode: "boolean" })
      .default(true)
      .notNull(),
    token: text("token"),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    passwordHash: text("password_hash"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("project_access_project_idx").on(table.projectId),
    index("project_access_client_idx").on(table.clientId),
  ],
);

export const shareSessions = sqliteTable(
  "share_sessions",
  {
    id: text("id").primaryKey(),
    accessId: text("access_id")
      .notNull()
      .references(() => projectAccess.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("share_sessions_access_idx").on(table.accessId),
    index("share_sessions_project_idx").on(table.projectId),
  ],
);

export const milestones = sqliteTable(
  "milestones",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["not_started", "in_progress", "done", "blocked"],
    })
      .default("not_started")
      .notNull(),
    weight: integer("weight").default(1).notNull(),
    position: integer("position").default(0).notNull(),
    dueDate: text("due_date"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("milestones_project_position_idx").on(
      table.projectId,
      table.position,
    ),
    index("milestones_project_status_idx").on(table.projectId, table.status),
  ],
);

export const paymentTerms = sqliteTable(
  "payment_terms",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amount: integer("amount").notNull(),
    dueDate: text("due_date"),
    status: text("status", {
      enum: ["unpaid", "partial", "paid", "overdue"],
    })
      .default("unpaid")
      .notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("payment_terms_project_position_idx").on(
      table.projectId,
      table.position,
    ),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    termId: text("term_id").references(() => paymentTerms.id, {
      onDelete: "set null",
    }),
    invoiceNo: text("invoice_no").notNull().unique(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    method: text("method"),
    provider: text("provider"),
    externalId: text("external_id"),
    status: text("status", {
      enum: ["pending", "verified", "rejected", "refunded"],
    })
      .default("verified")
      .notNull(),
    paidAt: text("paid_at").notNull(),
    note: text("note"),
    proofAttachmentId: text("proof_attachment_id"),
    submittedBy: text("submitted_by", { enum: ["owner", "client"] })
      .default("owner")
      .notNull(),
    verifiedBy: text("verified_by"),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    rejectedReason: text("rejected_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("payments_project_status_idx").on(table.projectId, table.status),
    index("payments_project_paid_idx").on(table.projectId, table.paidAt),
  ],
);

export const updates = sqliteTable(
  "updates",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    visibility: text("visibility", { enum: ["client", "internal"] })
      .default("client")
      .notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    editedAt: integer("edited_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("updates_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    entityType: text("entity_type", {
      enum: ["project", "milestone", "update", "payment"],
    })
      .default("project")
      .notNull(),
    entityId: text("entity_id"),
    parentId: text("parent_id"),
    authorType: text("author_type", { enum: ["owner", "client"] }).notNull(),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility", { enum: ["client", "internal"] })
      .default("client")
      .notNull(),
    editedAt: integer("edited_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("comments_project_created_idx").on(table.projectId, table.createdAt),
    index("comments_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    entityType: text("entity_type", {
      enum: ["project", "milestone", "update", "payment", "comment"],
    })
      .default("project")
      .notNull(),
    entityId: text("entity_id"),
    uploadedByType: text("uploaded_by_type", {
      enum: ["owner", "client"],
    }).notNull(),
    uploadedById: text("uploaded_by_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("attachments_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("attachments_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorType: text("actor_type", { enum: ["owner", "client", "system"] })
      .default("system")
      .notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
  },
  (table) => [
    index("activity_log_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientType: text("recipient_type", {
      enum: ["owner", "client"],
    }).notNull(),
    recipientId: text("recipient_id").notNull(),
    type: text("type").notNull(),
    payload: text("payload"),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    emailedAt: integer("emailed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
  },
  (table) => [
    index("notifications_recipient_idx").on(
      table.recipientType,
      table.recipientId,
      table.readAt,
    ),
  ],
);

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(timestampDefault)
      .notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("api_keys_user_idx").on(table.userId),
    uniqueIndex("api_keys_hash_idx").on(table.keyHash),
  ],
);

export const rateLimit = sqliteTable("rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start").notNull(),
});

export type User = typeof user.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectAccess = typeof projectAccess.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Update = typeof updates.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Activity = typeof activityLog.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
