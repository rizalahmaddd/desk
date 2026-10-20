export function activityLabel(action: string, metadata?: string | null) {
  let data: Record<string, unknown> = {};
  if (metadata) {
    try {
      data = JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  switch (action) {
    case "project.created":
      return "Project dibuat";
    case "project.updated":
      return "Detail project diperbarui";
    case "project.progress_updated":
      return `Progress diubah dari ${data.from ?? "?"}% ke ${data.to ?? "?"}%`;
    case "project.archived":
      return "Project diarsipkan";
    case "project.restored":
      return "Project dipulihkan dari arsip";
    case "milestone.created":
      return `Milestone "${data.title ?? "baru"}" ditambahkan`;
    case "milestone.updated":
      return `Milestone "${data.title ?? ""}" diperbarui`;
    case "milestone.status_changed":
      return "Status milestone diperbarui";
    case "milestone.deleted":
      return "Milestone dihapus";
    case "payment.created":
      return "Pembayaran dicatat";
    case "payment.verified":
      return "Pembayaran diverifikasi";
    case "payment.rejected":
      return "Klaim pembayaran ditolak";
    case "payment.deleted":
      return "Pembayaran dibatalkan";
    case "payment.claim_submitted":
      return "Klaim pembayaran dikirim client";
    case "access.created":
      return "Akses client dibuat";
    case "access.revoked":
      return "Akses client dicabut";
    case "access.rotated":
      return "Link akses client diperbarui";
    case "comment.created":
      return "Komentar baru";
    case "comment.deleted":
      return "Komentar dihapus";
    default:
      return action.replaceAll(".", " ").replaceAll("_", " ");
  }
}
