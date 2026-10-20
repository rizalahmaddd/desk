import openNextWorker from "./.open-next/worker.js";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(amount, currency) {
  const zeroDecimal = new Set([
    "BIF", "CLP", "DJF", "GNF", "IDR", "ISK", "JPY", "KMF", "KRW",
    "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
  ]);
  const digits = zeroDecimal.has(currency) ? 0 : 2;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits);
}

async function processReminders(env) {
  const now = Date.now();
  const reminderCooldownStart = now - 3 * 86_400_000;

  await env.DB.prepare("DELETE FROM share_sessions WHERE expires_at < ?")
    .bind(now)
    .run();
  await env.DB.prepare("DELETE FROM rate_limit WHERE window_start < ?")
    .bind(now - 86_400_000)
    .run();

  const retentionCutoff = now - 30 * 86_400_000;
  const { results: expiredFiles } = await env.DB.prepare(
    `SELECT id, r2_key FROM attachments
      WHERE (deleted_at IS NOT NULL AND deleted_at < ?)
         OR project_id IN (
           SELECT id FROM projects
            WHERE deleted_at IS NOT NULL AND deleted_at < ?
         )`,
  )
    .bind(retentionCutoff, retentionCutoff)
    .all();

  for (const file of expiredFiles ?? []) {
    await env.FILES.delete(file.r2_key);
  }

  await env.DB.prepare(
    `DELETE FROM attachments
      WHERE (deleted_at IS NOT NULL AND deleted_at < ?)
         OR project_id IN (
           SELECT id FROM projects
            WHERE deleted_at IS NOT NULL AND deleted_at < ?
         )`,
  )
    .bind(retentionCutoff, retentionCutoff)
    .run();

  await env.DB.prepare(
    "DELETE FROM projects WHERE deleted_at IS NOT NULL AND deleted_at < ?",
  )
    .bind(retentionCutoff)
    .run();

  if (!env.RESEND_API_KEY) return;

  const { results } = await env.DB.prepare(
    `SELECT pt.id AS term_id, pt.label, pt.amount, pt.due_date,
            p.id AS project_id, p.name AS project_name, p.currency,
            u.email AS owner_email, u.name AS owner_name
       FROM payment_terms pt
       JOIN projects p ON p.id = pt.project_id
       JOIN user u ON u.id = p.owner_id
      WHERE p.deleted_at IS NULL
        AND p.archived_at IS NULL
        AND p.status = 'active'
        AND pt.due_date IS NOT NULL
        AND date(pt.due_date) <= date('now', '+7 hours', '+3 day')
        AND COALESCE((
          SELECT SUM(pay.amount) FROM payments pay
           WHERE pay.term_id = pt.id
             AND pay.status = 'verified'
             AND pay.deleted_at IS NULL
        ), 0) < pt.amount
      ORDER BY pt.due_date ASC
      LIMIT 100`,
  ).all();

  const byOwner = new Map();
  for (const row of results ?? []) {
    const existing = await env.DB.prepare(
      `SELECT id FROM notifications
        WHERE recipient_type = 'owner'
          AND recipient_id = (SELECT owner_id FROM projects WHERE id = ?)
          AND type = 'payment.reminder'
          AND created_at >= ?
          AND json_extract(payload, '$.termId') = ?
        LIMIT 1`,
    )
      .bind(row.project_id, reminderCooldownStart, row.term_id)
      .first();

    if (existing) continue;

    const owner = byOwner.get(row.owner_email) ?? {
      email: row.owner_email,
      name: row.owner_name,
      items: [],
    };
    owner.items.push(row);
    byOwner.set(row.owner_email, owner);

    await env.DB.prepare(
      `INSERT INTO notifications (id, recipient_type, recipient_id, type, payload, created_at)
       VALUES (?, 'owner', (SELECT owner_id FROM projects WHERE id = ?), 'payment.reminder', ?, ?)`,
    )
      .bind(
        crypto.randomUUID().replaceAll("-", "").slice(0, 26),
        row.project_id,
        JSON.stringify({
          termId: row.term_id,
          projectId: row.project_id,
          title: "Pengingat pembayaran",
          message: `${row.project_name} · ${row.label}`,
        }),
        now,
      )
      .run();
  }

  for (const owner of byOwner.values()) {
    const items = owner.items
      .map(
        (item) =>
          `<li style="margin-bottom:8px"><strong>${escapeHtml(item.project_name)}</strong> — ${escapeHtml(item.label)}: ${escapeHtml(formatMoney(item.amount, item.currency))} (jatuh tempo ${escapeHtml(item.due_date)})</li>`,
      )
      .join("");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: owner.email,
        subject: "Pengingat tagihan project",
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px">
          <h1 style="font-size:20px">Pengingat pembayaran</h1>
          <p style="color:#4b5563">Halo ${escapeHtml(owner.name)}, ada tagihan yang mendekati atau melewati jatuh tempo.</p>
          <ul style="color:#1d1d1f;line-height:1.7">${items}</ul>
          <p><a href="${env.APP_URL}/projects" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Buka dashboard</a></p>
        </div>`,
      }),
    });
    if (!response.ok) {
      console.error(`reminder email failed for ${owner.email}: ${response.status} ${await response.text()}`);
    }
  }
}

const worker = {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },
  scheduled(_event, env, ctx) {
    ctx.waitUntil(
      processReminders(env).catch((error) =>
        console.error("scheduled task failed", error),
      ),
    );
  },
};

export default worker;
