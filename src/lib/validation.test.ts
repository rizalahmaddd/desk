import { describe, expect, it } from "vitest";
import { projectSchema, commentSchema, clientSchema } from "./validation";

const baseProject = {
  name: "Website baru",
  description: "",
  clientName: "Client",
  clientEmail: "client@example.com",
  clientCompany: "",
  status: "active",
  currency: "IDR",
  totalAmount: "5000000",
  startDate: "2026-10-01",
  dueDate: "2026-10-30",
  progressMode: "auto",
  progressPercent: "0",
  shareFinancials: "on",
};

describe("projectSchema", () => {
  it("accepts a valid project", () => {
    expect(projectSchema.safeParse(baseProject).success).toBe(true);
  });

  it("rejects a deadline before the start date", () => {
    const result = projectSchema.safeParse({
      ...baseProject,
      dueDate: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid client email", () => {
    const result = projectSchema.safeParse({
      ...baseProject,
      clientEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty project name", () => {
    const result = projectSchema.safeParse({ ...baseProject, name: "" });
    expect(result.success).toBe(false);
  });
});

describe("commentSchema", () => {
  it("rejects empty comments", () => {
    expect(commentSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("defaults visibility to client", () => {
    const result = commentSchema.parse({ body: "Halo" });
    expect(result.visibility).toBe("client");
  });
});

describe("clientSchema", () => {
  it("accepts a valid client with all fields", () => {
    const res = clientSchema.safeParse({
      name: "Budi Santoso",
      email: "budi@perusahaan.com",
      company: "PT Maju Terus",
      phone: "08123456789",
    });
    expect(res.success).toBe(true);
  });

  it("accepts a client with only name", () => {
    const res = clientSchema.safeParse({
      name: "Siti Rahma",
      email: "",
      company: "",
      phone: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Siti Rahma");
      expect(res.data.email).toBe("");
    }
  });

  it("rejects too short name", () => {
    const res = clientSchema.safeParse({
      name: "A",
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const res = clientSchema.safeParse({
      name: "Budi Santoso",
      email: "budi-bukan-email",
    });
    expect(res.success).toBe(false);
  });
});

