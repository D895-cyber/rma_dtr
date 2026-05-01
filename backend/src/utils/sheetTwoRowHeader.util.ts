/**
 * Parse a grid where sheet rows 1–2 are headers and row 3+ are data (1-based sheet indexing).
 * Handles merged row-1 cells via forward-fill; detects a single full-width title/banner row so keys stay usable.
 */

export type SheetCell = string | number | boolean | null | undefined;

function cellToString(c: SheetCell): string {
  if (c == null || c === '') return '';
  return String(c).trim();
}

/** Forward-fill empty cells with the last non-empty value (typical for merged section headers). */
export function forwardFillRow(row: string[]): string[] {
  let last = '';
  return row.map((cell) => {
    if (cell) last = cell;
    return last;
  });
}

function padToLength(row: string[], len: number): string[] {
  if (row.length >= len) return row.slice(0, len);
  return [...row, ...Array(len - row.length).fill('')];
}

/**
 * If row 1 acts as one banner/title across all data columns, omit it from key names and use row 2 only.
 */
function isBannerStyleRow1(filledRow1: string[], row2: string[]): boolean {
  const groups: string[] = [];
  for (let j = 0; j < row2.length; j++) {
    if (!row2[j]) continue;
    const g = filledRow1[j] || '';
    if (g) groups.push(g);
  }
  if (groups.length === 0) return false;
  const first = groups[0];
  if (!groups.every((g) => g === first)) return false;
  return first.length > 45 || /\breport\b|comprehensive/i.test(first);
}

function uniqueColumnKeys(baseKeys: string[]): string[] {
  const counts = new Map<string, number>();
  return baseKeys.map((k) => {
    const n = (counts.get(k) || 0) + 1;
    counts.set(k, n);
    if (n === 1) return k;
    return `${k}_${n}`;
  });
}

export type ParsedTwoHeaderSheet = {
  columnKeys: string[];
  headerRow1: string[];
  headerRow2: string[];
  /** One object per sheet row starting at row 3; values are strings (empty string if blank). */
  rows: Record<string, string>[];
  /** True when row 1 was treated as a banner and excluded from key composition. */
  row1IgnoredAsBanner: boolean;
};

/**
 * @param values Raw `values` from Google Sheets API (row-major). First array = sheet row 1.
 */
export function parseTwoHeaderRowsDataFromRow3(values: SheetCell[][]): ParsedTwoHeaderSheet {
  if (!values || values.length < 3) {
    return {
      columnKeys: [],
      headerRow1: [],
      headerRow2: [],
      rows: [],
      row1IgnoredAsBanner: false,
    };
  }

  const row1Raw = values[0].map(cellToString);
  const row2Raw = values[1].map(cellToString);

  const dataRows = values.slice(2);
  const maxCols = Math.max(
    row1Raw.length,
    row2Raw.length,
    ...dataRows.map((r) => r.length)
  );

  const headerRow1 = padToLength(row1Raw, maxCols);
  const headerRow2 = padToLength(row2Raw, maxCols);
  const filled1 = forwardFillRow(headerRow1);

  const row1IgnoredAsBanner = isBannerStyleRow1(filled1, headerRow2);

  const baseKeys: string[] = [];
  for (let j = 0; j < maxCols; j++) {
    const h1 = row1IgnoredAsBanner ? '' : filled1[j];
    const h2 = headerRow2[j];
    let key: string;
    if (h2) {
      key = h1 && h1 !== h2 ? `${h1} | ${h2}` : h2;
    } else if (h1) {
      key = h1;
    } else {
      key = `column_${j + 1}`;
    }
    baseKeys.push(key);
  }

  const columnKeys = uniqueColumnKeys(baseKeys);

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const dataRow = dataRows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < maxCols; j++) {
      obj[columnKeys[j]] = cellToString(dataRow[j]);
    }
    rows.push(obj);
  }

  return {
    columnKeys,
    headerRow1,
    headerRow2,
    rows,
    row1IgnoredAsBanner,
  };
}
