import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  formatInvoiceReminderText,
  formatPortalShareText,
  formatProjectProgressSummary,
  formatReceiptNotificationText,
  normalizeWhatsAppPhone,
} from "./whatsapp";
import { getDeadlineUrgency } from "./dates";
import { formatMoney } from "./money";

describe("normalizeWhatsAppPhone", () => {
  it("normalizes Indonesian phone numbers starting with 08", () => {
    expect(normalizeWhatsAppPhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppPhone("081234567890")).toBe("6281234567890");
  });

  it("normalizes phone numbers starting with +62 or 62", () => {
    expect(normalizeWhatsAppPhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppPhone("6281234567890")).toBe("6281234567890");
  });

  it("returns null for empty or invalid numbers", () => {
    expect(normalizeWhatsAppPhone("")).toBeNull();
    expect(normalizeWhatsAppPhone(null)).toBeNull();
    expect(normalizeWhatsAppPhone("---")).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("creates direct chat url when phone is provided", () => {
    const url = buildWhatsAppUrl("0812-3456-7890", "Halo!");
    expect(url).toBe("https://wa.me/6281234567890?text=Halo!");
  });

  it("creates generic share url when phone is null", () => {
    const url = buildWhatsAppUrl(null, "Halo Klien!");
    expect(url).toBe("https://wa.me/?text=Halo%20Klien!");
  });
});

describe("formatInvoiceReminderText", () => {
  it("formats Indonesian invoice reminder text with portal link", () => {
    const text = formatInvoiceReminderText({
      clientName: "Budi",
      projectName: "Website Busana",
      termLabel: "Termin 1 (DP)",
      amount: 6500000,
      currency: "IDR",
      dueDate: "2026-10-25",
      portalUrl: "https://desk.example.com/s/token123",
    });

    expect(text).toContain("Halo Kak *Budi*");
    expect(text).toContain("Website Busana");
    expect(text).toContain(formatMoney(6500000, "IDR"));
    expect(text).toContain("https://desk.example.com/s/token123");
  });
});

describe("formatReceiptNotificationText", () => {
  it("formats payment receipt notification text", () => {
    const text = formatReceiptNotificationText({
      clientName: "Budi",
      projectName: "Website Busana",
      invoiceNo: "INV-20261020-001",
      amount: 6500000,
      currency: "IDR",
      paidAt: "2026-10-20",
      method: "Transfer Bank",
    });

    expect(text).toContain("INV-20261020-001");
    expect(text).toContain(formatMoney(6500000, "IDR"));
    expect(text).toContain("Transfer Bank");
  });
});

describe("getDeadlineUrgency", () => {
  it("handles completed state", () => {
    const res = getDeadlineUrgency("2026-10-20", true);
    expect(res.level).toBe("completed");
    expect(res.label).toBe("Selesai");
  });

  it("handles null due date as flexible", () => {
    const res = getDeadlineUrgency(null, false);
    expect(res.level).toBe("flexible");
    expect(res.label).toBe("Fleksibel");
  });
});
