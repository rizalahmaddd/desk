import { describe, expect, it } from "vitest";
import {
  currencyFractionDigits,
  formatMoney,
  parseMoneyInput,
  toMajorUnits,
} from "./money";

describe("currencyFractionDigits", () => {
  it("treats IDR as zero-decimal", () => {
    expect(currencyFractionDigits("IDR")).toBe(0);
  });

  it("keeps two decimals for USD", () => {
    expect(currencyFractionDigits("USD")).toBe(2);
  });
});

describe("parseMoneyInput", () => {
  it("parses formatted rupiah", () => {
    expect(parseMoneyInput("Rp 7.500.000", "IDR")).toBe(7_500_000);
  });

  it("parses plain rupiah", () => {
    expect(parseMoneyInput("15000000", "IDR")).toBe(15_000_000);
  });

  it("parses dollar amounts with decimals", () => {
    expect(parseMoneyInput("1,500.50", "USD")).toBe(150_050);
  });

  it("parses indonesian decimal comma for USD", () => {
    expect(parseMoneyInput("1.500,50", "USD")).toBe(150_050);
  });

  it("returns zero for empty input", () => {
    expect(parseMoneyInput("", "IDR")).toBe(0);
  });

  it("rounds off a decimal fraction on zero-decimal currencies", () => {
    expect(parseMoneyInput("1.500.000,50", "IDR")).toBe(1_500_001);
    expect(parseMoneyInput("1.500.000,4", "IDR")).toBe(1_500_000);
    expect(parseMoneyInput("1500000.5", "IDR")).toBe(1_500_001);
    expect(parseMoneyInput("1,500,000", "IDR")).toBe(1_500_000);
    expect(parseMoneyInput("Rp 2.000", "IDR")).toBe(2_000);
  });

  it("never returns a negative amount", () => {
    expect(parseMoneyInput("-5000", "IDR")).toBe(0);
    expect(parseMoneyInput("-12.50", "USD")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("does not scale IDR by 100", () => {
    expect(formatMoney(7_500_000, "IDR")).toContain("7.500.000");
  });

  it("formats USD minor units", () => {
    expect(formatMoney(150_050, "USD")).toContain("1.500,50");
  });
});

describe("toMajorUnits", () => {
  it("keeps IDR as-is", () => {
    expect(toMajorUnits(7_500_000, "IDR")).toBe(7_500_000);
  });

  it("divides USD minor units", () => {
    expect(toMajorUnits(150_050, "USD")).toBe(1500.5);
  });
});
