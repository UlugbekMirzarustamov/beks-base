/**
 * Read a CSV exported from a bank app (Monzo, Starling, Revolut, Lloyds…).
 * Nothing is saved here — this only turns text into rows for the preview screen.
 */

/** Split CSV text into rows of cells. Handles "quoted, cells" and "" escapes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

/** "03/11/2026", "3/11/26", "2026-11-03", "2026-11-03T10:00" → "2026-11-03" (UK day-first). */
export function parseBankDate(text: string): string | null {
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

export interface ColumnGuess {
  date: number;
  amount: number;
  description: number;
}

/** Guess which columns hold the date, amount and description from the header row. */
export function guessColumns(header: string[]): ColumnGuess {
  const find = (words: string[]) => header.findIndex((h) => words.some((w) => h.toLowerCase().includes(w)));
  return {
    date: find(['date']),
    amount: find(['amount', 'value', 'money out', 'debit']),
    description: find(['description', 'name', 'payee', 'merchant', 'reference', 'details']),
  };
}

export interface CsvPurchase {
  date: string;
  amount: number; // positive = money spent
  description: string;
}

/**
 * Turn rows into purchases. Banks usually show spending as NEGATIVE numbers,
 * so by default we keep negatives (as positive amounts) and skip money coming in.
 */
export function rowsToPurchases(rows: string[][], cols: ColumnGuess, spendingIsNegative = true): CsvPurchase[] {
  const out: CsvPurchase[] = [];
  for (const row of rows) {
    const date = parseBankDate(row[cols.date] ?? '');
    const raw = Number((row[cols.amount] ?? '').replace(/[£,\s]/g, ''));
    if (!date || !Number.isFinite(raw) || raw === 0) continue;
    const spent = spendingIsNegative ? -raw : raw;
    if (spent <= 0) continue; // income / refunds
    out.push({ date, amount: Math.round(spent * 100) / 100, description: row[cols.description] ?? '' });
  }
  return out;
}
