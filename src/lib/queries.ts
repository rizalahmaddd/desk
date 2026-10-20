import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  like,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "./db";
import type { Project, ProjectAccess } from "./db/schema";
import { isOverdue } from "./dates";
import {
  activityLog,
  apiKeys,
  attachments,
  clients,
  comments,
  milestones,
  notifications,
  paymentTerms,
  payments,
  projectAccess,
  projects,
  updates,
  user,
} from "./db/schema";

export async function getDashboardData(db: Database, ownerId: string) {
  const projectRows = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        isNull(projects.deletedAt),
        isNull(projects.archivedAt),
      ),
    )
    .orderBy(desc(projects.updatedAt));

  const paidRows = await db
    .select({
      projectId: payments.projectId,
      paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        eq(payments.status, "verified"),
        isNull(payments.deletedAt),
      ),
    )
    .groupBy(payments.projectId);

  const pendingRows = await db
    .select({
      projectId: payments.projectId,
      pending: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      count: count(),
    })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        eq(payments.status, "pending"),
        isNull(payments.deletedAt),
      ),
    )
    .groupBy(payments.projectId);

  const paidByProject = new Map(
    paidRows.map((row) => [row.projectId, Number(row.paid)]),
  );
  const pendingByProject = new Map(
    pendingRows.map((row) => [row.projectId, Number(row.pending)]),
  );

  const projectList = projectRows.map(({ project, client }) => ({
    ...project,
    client,
    paid: paidByProject.get(project.id) ?? 0,
    pending: pendingByProject.get(project.id) ?? 0,
  }));

  const activeProjects = projectList.filter(
    (project) => project.status === "active",
  );
  const totalValue = projectList
    .filter((project) => project.status !== "cancelled")
    .reduce((total, project) => total + project.totalAmount, 0);
  const totalPaid = projectList.reduce(
    (total, project) => total + project.paid,
    0,
  );
  const pendingClaims = Array.from(pendingByProject.values()).reduce(
    (total, value) => total + value,
    0,
  );

  return {
    projects: projectList,
    stats: {
      activeProjects: activeProjects.length,
      totalProjects: projectList.length,
      totalValue,
      totalPaid,
      remaining: Math.max(totalValue - totalPaid, 0),
      pendingClaims,
    },
  };
}

export async function getProjectsForOwner(
  db: Database,
  ownerId: string,
  options: {
    status?: string;
    query?: string;
    archived?: boolean;
    clientId?: string;
  } = {},
) {
  const conditions = [
    eq(projects.ownerId, ownerId),
    isNull(projects.deletedAt),
  ];

  conditions.push(
    options.archived
      ? sql`${projects.archivedAt} is not null`
      : isNull(projects.archivedAt),
  );

  if (options.status && options.status !== "all") {
    conditions.push(eq(projects.status, options.status as never));
  }

  if (options.clientId && options.clientId !== "all") {
    conditions.push(eq(projects.clientId, options.clientId));
  }

  const search = options.query?.trim();
  if (search) {
    conditions.push(
      or(
        like(projects.name, `%${search}%`),
        like(projects.code, `%${search}%`),
        like(clients.name, `%${search}%`),
      )!,
    );
  }

  const rows = await db
    .select({ project: projects, client: clients })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt));

  const paidRows = await db
    .select({
      projectId: payments.projectId,
      paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        eq(payments.status, "verified"),
        isNull(payments.deletedAt),
      ),
    )
    .groupBy(payments.projectId);

  const paidMap = new Map(
    paidRows.map((row) => [row.projectId, Number(row.paid)]),
  );

  return rows.map(({ project, client }) => ({
    ...project,
    client,
    paid: paidMap.get(project.id) ?? 0,
  }));
}

export async function getProjectForOwner(
  db: Database,
  ownerId: string,
  projectId: string,
) {
  const [row] = await db
    .select({ project: projects, client: clients })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.ownerId, ownerId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getProjectSummary(db: Database, projectId: string) {
  const [verified] = await db
    .select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      count: count(),
    })
    .from(payments)
    .where(
      and(
        eq(payments.projectId, projectId),
        eq(payments.status, "verified"),
        isNull(payments.deletedAt),
      ),
    );

  const [pending] = await db
    .select({
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      count: count(),
    })
    .from(payments)
    .where(
      and(
        eq(payments.projectId, projectId),
        eq(payments.status, "pending"),
        isNull(payments.deletedAt),
      ),
    );

  return {
    paid: Number(verified?.total ?? 0),
    verifiedCount: Number(verified?.count ?? 0),
    pending: Number(pending?.total ?? 0),
    pendingCount: Number(pending?.count ?? 0),
  };
}

export async function getMilestones(db: Database, projectId: string) {
  return db
    .select()
    .from(milestones)
    .where(
      and(eq(milestones.projectId, projectId), isNull(milestones.deletedAt)),
    )
    .orderBy(asc(milestones.position), asc(milestones.createdAt));
}

export async function getTermsWithTotals(db: Database, projectId: string) {
  const terms = await db
    .select()
    .from(paymentTerms)
    .where(eq(paymentTerms.projectId, projectId))
    .orderBy(asc(paymentTerms.position), asc(paymentTerms.createdAt));

  const paidRows = await db
    .select({
      termId: payments.termId,
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.projectId, projectId),
        eq(payments.status, "verified"),
        isNull(payments.deletedAt),
      ),
    )
    .groupBy(payments.termId);

  const paidByTerm = new Map(
    paidRows
      .filter((row) => row.termId)
      .map((row) => [row.termId as string, Number(row.total)]),
  );

  return terms.map((term) => {
    const paid = paidByTerm.get(term.id) ?? 0;
    const overdue = term.dueDate !== null && isOverdue(term.dueDate) && paid < term.amount;
    const status =
      paid >= term.amount
        ? "paid"
        : overdue
          ? "overdue"
          : paid > 0
            ? "partial"
            : "unpaid";
    return { ...term, paid, computedStatus: status };
  });
}

export async function getPayments(db: Database, projectId: string) {
  const rows = await db
    .select({ payment: payments, term: paymentTerms })
    .from(payments)
    .leftJoin(paymentTerms, eq(payments.termId, paymentTerms.id))
    .where(
      and(eq(payments.projectId, projectId), isNull(payments.deletedAt)),
    )
    .orderBy(desc(payments.paidAt), desc(payments.createdAt));

  const proofIds = rows
    .map((row) => row.payment.proofAttachmentId)
    .filter((value): value is string => Boolean(value));

  const proofs =
    proofIds.length > 0
      ? await db
          .select()
          .from(attachments)
          .where(inArray(attachments.id, proofIds))
      : [];

  const proofMap = new Map(proofs.map((proof) => [proof.id, proof]));

  return rows.map(({ payment, term }) => ({
    ...payment,
    term,
    proof: payment.proofAttachmentId
      ? (proofMap.get(payment.proofAttachmentId) ?? null)
      : null,
  }));
}

export async function getUpdates(
  db: Database,
  projectId: string,
  includeInternal: boolean,
) {
  const conditions = [
    eq(updates.projectId, projectId),
    isNull(updates.deletedAt),
  ];
  if (!includeInternal) conditions.push(eq(updates.visibility, "client"));

  return db
    .select()
    .from(updates)
    .where(and(...conditions))
    .orderBy(desc(updates.createdAt));
}

export async function getCommentsWithAuthors(
  db: Database,
  projectId: string,
  includeInternal: boolean,
) {
  const conditions = [eq(comments.projectId, projectId)];
  if (!includeInternal) conditions.push(eq(comments.visibility, "client"));

  const rows = await db
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(asc(comments.createdAt));

  const clientIds = Array.from(
    new Set(rows.filter((row) => row.authorType === "client").map((row) => row.authorId)),
  );

  const clientRows =
    clientIds.length > 0
      ? await db.select().from(clients).where(inArray(clients.id, clientIds))
      : [];

  const [owner] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .innerJoin(projects, eq(projects.ownerId, user.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  const clientMap = new Map(clientRows.map((client) => [client.id, client.name]));

  return rows.map((comment) => ({
    ...comment,
    body: comment.deletedAt ? "" : comment.body,
    authorName:
      comment.authorType === "owner"
        ? (owner?.name ?? "Freelancer")
        : (clientMap.get(comment.authorId) ?? "Client"),
  }));
}

export async function getOwnerStorageUsage(db: Database, ownerId: string) {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${attachments.sizeBytes}), 0)`,
    })
    .from(attachments)
    .innerJoin(projects, eq(attachments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        isNull(attachments.deletedAt),
      ),
    );

  return Number(row?.total ?? 0);
}

export async function getAttachments(db: Database, projectId: string) {
  return db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.projectId, projectId),
        isNull(attachments.deletedAt),
      ),
    )
    .orderBy(desc(attachments.createdAt));
}

function clientVisibleAttachment(canViewFinancials: boolean) {
  return or(
    inArray(attachments.entityType, ["project", "milestone"]),
    and(
      eq(attachments.entityType, "comment"),
      eq(comments.visibility, "client"),
      isNull(comments.deletedAt),
    ),
    and(
      eq(attachments.entityType, "update"),
      eq(updates.visibility, "client"),
      isNull(updates.deletedAt),
    ),
    canViewFinancials ? eq(attachments.entityType, "payment") : sql`0`,
  );
}

function clientAttachmentQuery(db: Database, canViewFinancials: boolean, ...where: SQL[]) {
  return db
    .select({ attachment: attachments })
    .from(attachments)
    .leftJoin(
      comments,
      and(eq(attachments.entityType, "comment"), eq(comments.id, attachments.entityId)),
    )
    .leftJoin(
      updates,
      and(eq(attachments.entityType, "update"), eq(updates.id, attachments.entityId)),
    )
    .where(and(isNull(attachments.deletedAt), clientVisibleAttachment(canViewFinancials), ...where));
}

// Clients must never see files from internal/deleted comments and updates, or payment proofs
// when financials are hidden from them.
export async function getClientVisibleAttachments(
  db: Database,
  projectId: string,
  canViewFinancials: boolean,
) {
  const rows = await clientAttachmentQuery(
    db,
    canViewFinancials,
    eq(attachments.projectId, projectId),
  ).orderBy(desc(attachments.createdAt));
  return rows.map((row) => row.attachment);
}

export async function isAttachmentVisibleToClient(
  db: Database,
  attachmentId: string,
  projectId: string,
  canViewFinancials: boolean,
) {
  const [row] = await clientAttachmentQuery(
    db,
    canViewFinancials,
    eq(attachments.id, attachmentId),
    eq(attachments.projectId, projectId),
  ).limit(1);
  return Boolean(row);
}

export async function getProjectAccessList(db: Database, projectId: string) {
  return db
    .select({ access: projectAccess, client: clients })
    .from(projectAccess)
    .leftJoin(clients, eq(projectAccess.clientId, clients.id))
    .where(eq(projectAccess.projectId, projectId))
    .orderBy(desc(projectAccess.createdAt));
}

export async function getActivity(db: Database, projectId: string, limit = 30) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.projectId, projectId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function getUnreadNotifications(db: Database, ownerId: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientType, "owner"),
        eq(notifications.recipientId, ownerId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const [unreadRow] = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientType, "owner"),
        eq(notifications.recipientId, ownerId),
        isNull(notifications.readAt),
      ),
    );

  return {
    items: rows.map((row) => ({
      ...row,
      payload: row.payload
        ? (JSON.parse(row.payload) as Record<string, unknown>)
        : {},
    })),
    unread: Number(unreadRow?.total ?? 0),
  };
}

export async function getClientNotifications(
  db: Database,
  clientId: string,
  projectId: string,
) {
  // A client record spans every project of that freelancer, so scope to the open portal project.
  const scope = and(
    eq(notifications.recipientType, "client"),
    eq(notifications.recipientId, clientId),
    sql`json_extract(${notifications.payload}, '$.projectId') = ${projectId}`,
  );

  const rows = await db
    .select()
    .from(notifications)
    .where(scope)
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const [unreadRow] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(scope, isNull(notifications.readAt)));

  return {
    items: rows.map((row) => ({
      ...row,
      payload: row.payload
        ? (JSON.parse(row.payload) as Record<string, unknown>)
        : {},
    })),
    unread: Number(unreadRow?.total ?? 0),
  };
}

export async function getPortalProjectData(
  db: Database,
  projectId: string,
  canViewFinancials: boolean,
) {
  const projectMilestones = await getMilestones(db, projectId);
  const projectComments = await getCommentsWithAuthors(db, projectId, false);
  const projectAttachments = await getAttachments(db, projectId);
  const projectUpdates = await getUpdates(db, projectId, false);
  const summary = canViewFinancials
    ? await getProjectSummary(db, projectId)
    : null;
  const projectPayments = canViewFinancials
    ? await getPayments(db, projectId)
    : [];
  const terms = canViewFinancials ? await getTermsWithTotals(db, projectId) : [];

  return {
    milestones: projectMilestones,
    comments: projectComments,
    attachments: projectAttachments,
    updates: projectUpdates,
    summary,
    payments: projectPayments,
    terms,
  };
}

export async function getClientsForOwner(
  db: Database,
  ownerId: string,
  options: { query?: string } = {},
) {
  const conditions = [
    eq(clients.ownerId, ownerId),
    isNull(clients.deletedAt),
  ];

  const search = options.query?.trim();
  if (search) {
    conditions.push(
      or(
        like(clients.name, `%${search}%`),
        like(clients.company, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`),
      )!,
    );
  }

  const clientRows = await db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(desc(clients.updatedAt));

  if (clientRows.length === 0) return [];

  // Fetch projects stats for these clients
  const clientProjects = await db
    .select({
      id: projects.id,
      clientId: projects.clientId,
      status: projects.status,
      totalAmount: projects.totalAmount,
      archivedAt: projects.archivedAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        isNull(projects.deletedAt),
        inArray(
          projects.clientId,
          clientRows.map((c) => c.id),
        ),
      ),
    );

  // Fetch verified payments
  const projectIds = clientProjects.map((p) => p.id);
  const paidRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: payments.projectId,
            paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
          })
          .from(payments)
          .where(
            and(
              inArray(payments.projectId, projectIds),
              eq(payments.status, "verified"),
              isNull(payments.deletedAt),
            ),
          )
          .groupBy(payments.projectId)
      : [];

  const paidMap = new Map(paidRows.map((r) => [r.projectId, Number(r.paid)]));

  return clientRows.map((client) => {
    const projs = clientProjects.filter((p) => p.clientId === client.id);
    const activeProjects = projs.filter(
      (p) => p.status === "active" && !p.archivedAt,
    );
    const totalAmount = projs
      .filter((p) => p.status !== "cancelled")
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaid = projs.reduce(
      (sum, p) => sum + (paidMap.get(p.id) ?? 0),
      0,
    );
    const pendingBalance = Math.max(0, totalAmount - totalPaid);

    return {
      ...client,
      projectCount: projs.length,
      activeProjectsCount: activeProjects.length,
      totalAmount,
      totalPaid,
      pendingBalance,
    };
  });
}

export async function getClientForOwner(
  db: Database,
  ownerId: string,
  clientId: string,
) {
  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.ownerId, ownerId),
        isNull(clients.deletedAt),
      ),
    )
    .limit(1);

  if (!client) return null;

  const projectRows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        eq(projects.clientId, clientId),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(projects.updatedAt));

  const projectIds = projectRows.map((p) => p.id);
  const paidRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: payments.projectId,
            paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
          })
          .from(payments)
          .where(
            and(
              inArray(payments.projectId, projectIds),
              eq(payments.status, "verified"),
              isNull(payments.deletedAt),
            ),
          )
          .groupBy(payments.projectId)
      : [];

  const paidMap = new Map(paidRows.map((r) => [r.projectId, Number(r.paid)]));

  const projectList = projectRows.map((p) => ({
    ...p,
    paid: paidMap.get(p.id) ?? 0,
    pending: Math.max(0, p.totalAmount - (paidMap.get(p.id) ?? 0)),
  }));

  const totalAmount = projectList
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = projectList.reduce((sum, p) => sum + p.paid, 0);
  const pendingBalance = Math.max(0, totalAmount - totalPaid);
  const activeCount = projectList.filter(
    (p) => p.status === "active" && !p.archivedAt,
  ).length;
  const completedCount = projectList.filter((p) => p.status === "completed").length;

  return {
    client,
    projects: projectList,
    stats: {
      totalProjects: projectList.length,
      activeCount,
      completedCount,
      totalAmount,
      totalPaid,
      pendingBalance,
    },
  };
}

export async function getComprehensiveStudioReport(db: Database, ownerId: string) {
  const projectRows = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.ownerId, ownerId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));

  const projectIds = projectRows.map((r) => r.project.id);

  const allPayments =
    projectIds.length > 0
      ? await db
          .select({
            payment: payments,
            project: {
              id: projects.id,
              name: projects.name,
              code: projects.code,
              currency: projects.currency,
            },
            client: {
              id: clients.id,
              name: clients.name,
            },
          })
          .from(payments)
          .innerJoin(projects, eq(payments.projectId, projects.id))
          .leftJoin(clients, eq(projects.clientId, clients.id))
          .where(and(inArray(payments.projectId, projectIds), isNull(payments.deletedAt)))
          .orderBy(desc(payments.paidAt), desc(payments.createdAt))
      : [];

  const allTerms =
    projectIds.length > 0
      ? await db
          .select({
            term: paymentTerms,
            project: {
              id: projects.id,
              name: projects.name,
              code: projects.code,
              currency: projects.currency,
            },
            client: {
              id: clients.id,
              name: clients.name,
            },
          })
          .from(paymentTerms)
          .innerJoin(projects, eq(paymentTerms.projectId, projects.id))
          .leftJoin(clients, eq(projects.clientId, clients.id))
          .where(inArray(paymentTerms.projectId, projectIds))
          .orderBy(asc(paymentTerms.dueDate), asc(paymentTerms.position))
      : [];

  const allMilestones =
    projectIds.length > 0
      ? await db
          .select({
            milestone: milestones,
            project: {
              id: projects.id,
              name: projects.name,
              code: projects.code,
            },
          })
          .from(milestones)
          .innerJoin(projects, eq(milestones.projectId, projects.id))
          .where(and(inArray(milestones.projectId, projectIds), isNull(milestones.deletedAt)))
          .orderBy(asc(milestones.dueDate), asc(milestones.position))
      : [];

  const allClients = await db
    .select()
    .from(clients)
    .where(and(eq(clients.ownerId, ownerId), isNull(clients.deletedAt)))
    .orderBy(asc(clients.name));

  return {
    projects: projectRows,
    payments: allPayments,
    terms: allTerms,
    milestones: allMilestones,
    clients: allClients,
  };
}

export async function getSearchItemsForOwner(db: Database, ownerId: string) {
  const [projectList, clientList] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
        status: projects.status,
      })
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.updatedAt)),
    db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.company,
      })
      .from(clients)
      .where(and(eq(clients.ownerId, ownerId), isNull(clients.deletedAt)))
      .orderBy(asc(clients.name)),
  ]);

  return { projects: projectList, clients: clientList };
}


function accessRank(access: ProjectAccess) {
  return (
    (access.scope === "comment" ? 4 : 0) +
    (access.canViewFinancials ? 2 : 0) +
    (access.expiresAt ? 0 : 1)
  );
}

export async function getSharedProjectsForUser(db: Database, userId: string) {
  // Read email + verification from the DB: the session cookie cache can be minutes stale,
  // and an unverified address must never unlock someone else's project.
  const [viewer] = await db
    .select({ id: user.id, email: user.email, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!viewer?.emailVerified) return [];

  const rows = await db
    .select({
      access: projectAccess,
      project: projects,
      ownerName: user.name,
    })
    .from(projectAccess)
    .innerJoin(clients, eq(projectAccess.clientId, clients.id))
    .innerJoin(projects, eq(projectAccess.projectId, projects.id))
    .innerJoin(user, eq(projects.ownerId, user.id))
    .where(
      and(
        eq(sql`lower(${clients.email})`, viewer.email.trim().toLowerCase()),
        eq(clients.ownerId, projects.ownerId),
        ne(projects.ownerId, viewer.id),
        isNull(clients.deletedAt),
        isNull(projects.deletedAt),
        isNull(projectAccess.revokedAt),
        or(isNull(projectAccess.expiresAt), gt(projectAccess.expiresAt, new Date())),
      ),
    )
    .orderBy(desc(projects.updatedAt));

  const byProject = new Map<
    string,
    { access: ProjectAccess; project: Project; ownerName: string; lastOpenedAt: Date | null }
  >();

  for (const row of rows) {
    const current = byProject.get(row.project.id);
    const lastUsed = row.access.lastUsedAt;
    if (!current) {
      byProject.set(row.project.id, { ...row, lastOpenedAt: lastUsed });
      continue;
    }
    if (lastUsed && (!current.lastOpenedAt || lastUsed > current.lastOpenedAt)) {
      current.lastOpenedAt = lastUsed;
    }
    const better =
      accessRank(row.access) > accessRank(current.access) ||
      (accessRank(row.access) === accessRank(current.access) &&
        (row.access.expiresAt?.getTime() ?? 0) > (current.access.expiresAt?.getTime() ?? 0));
    if (better) current.access = row.access;
  }

  return [...byProject.values()];
}

export type SharedProject = Awaited<ReturnType<typeof getSharedProjectsForUser>>[number];

export async function hasMoneyRecords(db: Database, projectId: string) {
  const [[term], [payment]] = await Promise.all([
    db
      .select({ id: paymentTerms.id })
      .from(paymentTerms)
      .where(eq(paymentTerms.projectId, projectId))
      .limit(1),
    db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.projectId, projectId), isNull(payments.deletedAt)))
      .limit(1),
  ]);
  return Boolean(term || payment);
}

export async function isProjectTerm(db: Database, projectId: string, termId: string) {
  const [row] = await db
    .select({ id: paymentTerms.id })
    .from(paymentTerms)
    .where(and(eq(paymentTerms.id, termId), eq(paymentTerms.projectId, projectId)))
    .limit(1);
  return Boolean(row);
}

export async function isProjectAttachment(
  db: Database,
  projectId: string,
  attachmentId: string,
  uploader?: { type: "owner" | "client"; id: string },
) {
  const conditions = [
    eq(attachments.id, attachmentId),
    eq(attachments.projectId, projectId),
    isNull(attachments.deletedAt),
  ];
  if (uploader) {
    conditions.push(
      eq(attachments.uploadedByType, uploader.type),
      eq(attachments.uploadedById, uploader.id),
    );
  }
  const [row] = await db
    .select({ id: attachments.id })
    .from(attachments)
    .where(and(...conditions))
    .limit(1);
  return Boolean(row);
}

export async function getApiKeysForUser(db: Database, userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}
