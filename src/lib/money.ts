const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "IDR",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function currencyFractionDigits(currency: string) {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  try {
    return (
      new Intl.NumberFormat("en-US", { style: "currency", currency: code })
        .resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function formatMoney(amountMinor: number, currency = "IDR") {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: digits === 0 ? 0 : 2,
    maximumFractionDigits: digits,
  }).format(amountMinor / 10 ** digits);
}

export function parseMoneyInput(value: string, currency = "IDR") {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const digits = currencyFractionDigits(currency);
  let normalized = trimmed.replace(/\s/g, "");

  if (digits === 0) {
    // "1.500.000" uses dots as thousands, but "1.500.000,50" or "1500000.5" carry a fraction
    // that must be rounded off rather than glued onto the integer part.
    const fraction = normalized.match(/[.,](\d{1,2})$/);
    if (fraction) normalized = normalized.slice(0, -fraction[0].length) + "." + fraction[1];
    const [whole, decimals = ""] = normalized.split(/\.(?=\d{1,2}$)/);
    const amount = Number(`${whole.replace(/[^\d-]/g, "")}.${decimals}`);
    return Math.max(0, Math.round(amount || 0));
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma > lastDot) {
    normalized = normalized.replaceAll(".", "").replace(",", ".");
  } else {
    normalized = normalized.replaceAll(",", "");
  }

  normalized = normalized.replace(/[^\d.-]/g, "");
  return Math.max(0, Math.round((Number(normalized) || 0) * 10 ** digits));
}

export function toMajorUnits(amountMinor: number, currency = "IDR") {
  return amountMinor / 10 ** currencyFractionDigits(currency);
}

export function sumAmounts(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}
