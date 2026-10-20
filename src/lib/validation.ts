import { z } from "zod";
import {
  MILESTONE_STATUSES,
  PROJECT_STATUSES,
  SUPPORTED_CURRENCIES,
} from "./constants";

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .optional()
  .or(z.literal(""));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((value) => value === "on" || value === "true");

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Nama customer minimal 2 karakter").max(120),
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("Email customer tidak valid")])
    .optional()
    .default(""),
  company: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
});

export const projectSchema = z.object({
  clientId: z.string().trim().optional().default(""),
  name: z.string().trim().min(2, "Nama project minimal 2 karakter").max(120),
  description: z.string().trim().max(4000).optional().default(""),
  clientName: z.string().trim().max(120).optional().default(""),
  clientEmail: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("Email client tidak valid")])
    .optional()
    .default(""),
  clientCompany: z.string().trim().max(120).optional().default(""),
  status: z.enum(PROJECT_STATUSES),
  currency: z.enum(SUPPORTED_CURRENCIES).default("IDR"),
  totalAmount: z.string().trim().min(1, "Nilai project wajib diisi"),
  startDate: optionalDate,
  dueDate: optionalDate,
  progressMode: z.enum(["auto", "manual"]).default("auto"),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
  shareFinancials: checkbox,
}).refine(
  (value) =>
    !value.startDate ||
    !value.dueDate ||
    value.dueDate >= value.startDate,
  { message: "Deadline tidak boleh sebelum tanggal mulai", path: ["dueDate"] },
);

export const milestoneSchema = z.object({
  title: z.string().trim().min(2, "Judul milestone minimal 2 karakter").max(160),
  description: z.string().trim().max(2000).optional().default(""),
  status: z.enum(MILESTONE_STATUSES).default("not_started"),
  weight: z.coerce.number().int().min(1).max(100).default(1),
  dueDate: optionalDate,
});

export const milestoneStatusSchema = z.object({
  milestoneId: z.string().min(1),
  status: z.enum(MILESTONE_STATUSES),
});

export const paymentTermSchema = z.object({
  label: z.string().trim().min(1, "Label termin wajib diisi").max(120),
  amount: z.string().trim().min(1, "Nominal wajib diisi"),
  dueDate: optionalDate,
});

export const paymentSchema = z.object({
  termId: z.string().optional().default(""),
  amount: z.string().trim().min(1, "Nominal wajib diisi"),
  paidAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal pembayaran tidak valid"),
  method: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(1000).optional().default(""),
  status: z.enum(["pending", "verified"]).default("verified"),
});

export const paymentClaimSchema = z.object({
  amount: z.string().trim().min(1, "Nominal wajib diisi"),
  paidAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal pembayaran tidak valid"),
  method: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(1000).optional().default(""),
});

export const paymentDecisionSchema = z.object({
  paymentId: z.string().min(1),
  decision: z.enum(["verify", "reject"]),
  reason: z.string().trim().max(500).optional().default(""),
});

export const accessSchema = z.object({
  clientName: z.string().trim().max(120).optional().default(""),
  clientEmail: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("Email client tidak valid")])
    .optional()
    .default(""),
  scope: z.enum(["view", "comment"]).default("comment"),
  canViewFinancials: checkbox,
  expiresInDays: z.coerce.number().int().min(0).max(365).default(30),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Komentar tidak boleh kosong").max(5000),
  visibility: z.enum(["client", "internal"]).default("client"),
  entityType: z
    .enum(["project", "milestone", "update", "payment"])
    .default("project"),
  entityId: z.string().optional().default(""),
  parentId: z.string().optional().default(""),
});

export const updateSchema = z.object({
  title: z.string().trim().min(2, "Judul update minimal 2 karakter").max(160),
  body: z.string().trim().max(10_000).optional().default(""),
  visibility: z.enum(["client", "internal"]).default("client"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  businessName: z.string().trim().max(120).optional().default(""),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type AccessInput = z.infer<typeof accessSchema>;
export type CommentInput = z.infer<typeof commentSchema>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

export function isSupportedCurrency(value: unknown): value is (typeof SUPPORTED_CURRENCIES)[number] {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
