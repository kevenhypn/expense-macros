/** Integer US cents. Inputs that are not a finite dollar amount return null. */

const MAX_CENTS = 999_999_999;

export function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function dollarsToCents(value: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const negative = value < 0;
  const abs = Math.abs(value);
  if (abs > MAX_CENTS / 100) return null;
  // toFixed(6) is exact for two-decimal currency under $10,000,000 and
  // corrects binary values such as 1.005 and 19.989999999999998.
  const [whole, frac = ""] = abs.toFixed(6).split(".");
  let cents = Number(whole) * 100 + Number(frac.slice(0, 2));
  if (frac[2] >= "5") cents += 1;
  if (cents > MAX_CENTS) return null;
  if (cents === 0) return 0;
  return negative ? -cents : cents;
}

/** Parse a dollar string to signed cents. Zero is 0. Invalid input is null. */
export function parseMoneyToCents(input: string): number | null {
  let raw = input.trim().replace(/\uFEFF/g, "").replace(/\s+/g, "");
  if (!raw) return null;
  let negative = false;
  raw = raw.replace(/[−–—]/g, "-");
  if (raw.startsWith("(") && raw.endsWith(")")) {
    negative = true;
    raw = raw.slice(1, -1);
  }
  raw = raw.replace(/^(?:USD|usd|\$)+/, "");
  if (raw.startsWith("+")) raw = raw.slice(1);
  else if (raw.startsWith("-")) {
    negative = !negative;
    raw = raw.slice(1);
  }
  raw = raw.replace(/^(?:USD|usd|\$)+/, "").replace(/,/g, "");
  if (!/^(?:\d{1,7}(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw)) return null;
  const [whole, frac = ""] = raw.split(".");
  const cents = Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
  if (cents > MAX_CENTS) return null;
  return negative && cents !== 0 ? -cents : cents;
}

export function amountValue(value: string): number | null {
  const cents = parseMoneyToCents(value);
  return cents === null ? null : cents / 100;
}

export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${frac}`;
}

export function money(value: number): string {
  const cents = dollarsToCents(value);
  return cents === null ? "$0.00" : formatCents(cents);
}

export function centsToInput(cents: number): string {
  const abs = Math.abs(Math.trunc(cents));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
