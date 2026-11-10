import type { Transaction, TransactionCategory } from "../types";
import { isDate, isoDate } from "./budget.ts";
import { categoryFromLabel } from "./categories.ts";
import { parseMoneyToCents } from "./money.ts";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export function parseImportDate(value: string): string | null {
  const text = value.trim().replace(/\uFEFF/g, "");
  if (isDate(text)) return text;
  const ymd = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (ymd) return checked(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  const mdy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (mdy) {
    let year = Number(mdy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return checked(year, Number(mdy[1]), Number(mdy[2]));
  }
  const named = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (!month) return null;
    return checked(Number(named[3]), month, Number(named[2]));
  }
  return null;
}

function checked(year: number, month: number, day: number) {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isDate(iso) ? iso : null;
}

function detectDelimiter(line: string) {
  const counts: Record<string, number> = { "|": 0, "\t": 0, ";": 0, ",": 0 };
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && counts[char] !== undefined) counts[char] += 1;
  }
  const [winner] = Object.entries(counts).sort((a, b) => b[1] - a[1] || "|,\t;".indexOf(a[0]) - "|,\t;".indexOf(b[0]));
  return winner && winner[1] > 0 ? winner[0] : null;
}

function splitDelimited(line: string, delimiter: string) {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = false;
      } else current += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      fields.push(current.trim());
      current = "";
    } else current += char;
  }
  fields.push(current.trim());
  if (fields.length > 3 && fields[fields.length - 1] === "") fields.pop();
  return fields;
}

function pendingFromStatus(value: string | undefined): boolean | null {
  if (!value) return false;
  const status = value.trim().toLowerCase();
  if (["posted", "cleared", "settled", "complete", "completed"].includes(status)) return false;
  if (["pending", "hold", "held", "authorized", "authorised"].includes(status)) return true;
  return null;
}

function importId(parts: (string | number | boolean)[], occurrence: number) {
  return `import:${parts.map(part => encodeURIComponent(String(part))).join(":")}:${occurrence}`;
}

export function parseTransactionImport(input: string, today = isoDate()): Transaction[] {
  const text = input.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const content = lines.map((line, index) => ({ line: line.trim(), number: index + 1 })).filter(item => item.line);
  if (!content.length) throw new Error("Paste at least one transaction.");
  const delimiter = detectDelimiter(content[0].line);
  if (!delimiter) throw new Error("Separate fields with a vertical bar, comma, semicolon, or tab.");

  const errors: string[] = [];
  const counts = new Map<string, number>();
  const entries: Transaction[] = [];
  const firstFields = splitDelimited(content[0].line, delimiter);
  const header = /date/i.test(firstFields[0] ?? "") && /amount/i.test(firstFields[1] ?? "");
  const rows = header ? content.slice(1) : content;
  if (!rows.length) throw new Error("The paste only has a header. Add at least one transaction under it.");
  if (rows.length > 500) throw new Error("Import up to 500 rows at a time.");

  rows.forEach(({ line, number }) => {
    const fail = (message: string) => errors.push(`Line ${number}: ${message}`);
    let fields = splitDelimited(line, delimiter);
    if (fields.length < 3) {
      for (const other of ["|", "\t", ";", ","]) {
        if (other === delimiter) continue;
        const attempt = splitDelimited(line, other);
        if (attempt.length > fields.length) fields = attempt;
      }
    }
    if (fields.length < 3 || fields.length > 6) {
      fail("Use date, amount, category, and an optional description, account, and status.");
      return;
    }
    const [rawDate, rawAmount, rawCategory, rawNote = "", rawAccount = "", rawStatus] = fields;
    const date = parseImportDate(rawDate);
    if (!date) {
      fail("Use a real date, such as 2026-11-10, 11/10/2026, or Nov 10, 2026.");
      return;
    }
    if (date > today) {
      fail("Use a date on or before today.");
      return;
    }
    const category = categoryFromLabel(rawCategory);
    if (!category) {
      fail("Use Food, Shopping, Transport, Entertainment, Other, Bills, Savings, or Income.");
      return;
    }
    const parsed = parseMoneyToCents(rawAmount);
    if (parsed === null || parsed === 0) {
      fail("Use a nonzero amount, such as -12.40, ($12.40), or 12.40.");
      return;
    }
    const compact = rawAmount.trim().replace(/\s+/g, "").replace(/^(?:USD|usd|\$)+/i, "");
    const explicitSign = compact.startsWith("+") || /^[-−–—]/.test(compact) || (compact.startsWith("(") && compact.endsWith(")"));
    let amount = parsed;
    if (!explicitSign) amount = category === "Income" ? Math.abs(parsed) : -Math.abs(parsed);
    if (category === "Income" && amount < 0) {
      fail("Income has to be positive.");
      return;
    }
    const note = rawNote.trim();
    const account = rawAccount.trim() === "-" ? "" : rawAccount.trim();
    if (note.length > 100) {
      fail("Keep the description to 100 characters.");
      return;
    }
    if (account.length > 60) {
      fail("Keep the account to 60 characters.");
      return;
    }
    const pending = pendingFromStatus(rawStatus);
    if (pending === null) {
      fail("Use posted or pending for the status.");
      return;
    }
    const key = [date, amount, category, note, account, pending].join("|");
    const occurrence = (counts.get(key) ?? 0) + 1;
    counts.set(key, occurrence);
    const tx: Transaction = {
      id: importId([date, amount, category, note, account, pending], occurrence),
      date,
      amount: amount / 100,
      category: category as TransactionCategory,
      pending: pending || undefined,
    };
    if (note) tx.note = note;
    if (account) tx.account = account;
    entries.push(tx);
  });

  if (errors.length) {
    const shown = errors.slice(0, 8);
    if (errors.length > shown.length) shown.push(`${errors.length - shown.length} more rows need a fix.`);
    throw new Error(shown.join("\n"));
  }
  return entries;
}
