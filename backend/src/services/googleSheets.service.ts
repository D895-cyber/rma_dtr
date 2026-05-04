import fs from 'fs';
import path from 'path';
import type { sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

type GoogleApi = typeof import('googleapis').google;

/** Resolve key file path: absolute as-is; relative paths from process.cwd() (run backend from `backend/`). */
function resolveCredentialsKeyFile(configured: string): string {
  const trimmed = configured.trim().replace(/^["']|["']$/g, '');
  const absolute = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(process.cwd(), trimmed);

  if (!fs.existsSync(absolute)) {
    throw new Error(
      `Google Sheets key file not found: ${absolute}. ` +
        `Fix GOOGLE_APPLICATION_CREDENTIALS in backend/.env (e.g. ./src/config/google-sheets-key.json) ` +
        `or see backend/GOOGLE_SHEETS_SETUP.md.`
    );
  }

  return absolute;
}

function buildAuth(google: GoogleApi) {
  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsJson) {
    try {
      const credentials =
        typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
      return new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });
    } catch (e) {
      throw new Error('Invalid GOOGLE_SHEETS_CREDENTIALS_JSON');
    }
  }

  if (credentialsPath) {
    const keyFile = resolveCredentialsKeyFile(credentialsPath);
    return new google.auth.GoogleAuth({
      keyFile,
      scopes: SCOPES,
    });
  }

  throw new Error(
    'Google Sheets credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS (path to JSON) or GOOGLE_SHEETS_CREDENTIALS_JSON (JSON string).'
  );
}

let sheetsClientPromise: Promise<sheets_v4.Sheets> | null = null;

/**
 * Returns a cached Sheets v4 client. Loads `googleapis` on first use only (package is very large;
 * eager import slows every server start).
 */
export function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const { google } = await import('googleapis');
      const auth = buildAuth(google);
      return google.sheets({ version: 'v4', auth });
    })();
  }
  return sheetsClientPromise;
}

/**
 * Ensure the spreadsheet has sheets (tabs) with the given names. Creates any that are missing.
 */
export async function ensureSheetsExist(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetNames: string[]
): Promise<void> {
  const res = await client.spreadsheets.get({ spreadsheetId });
  const existing = (res.data.sheets || [])
    .map((s) => s.properties?.title || '')
    .filter(Boolean);

  const toCreate = sheetNames.filter((name) => !existing.includes(name));
  if (toCreate.length === 0) return;

  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: toCreate.map((title) => ({
        addSheet: { properties: { title } },
      })),
    },
  });
}

function columnLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s || 'A';
}

/** Sheet title for A1 notation (quotes + escape embedded single quotes). */
function sheetRangePrefix(sheetName: string): string {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Clears columns A–`columnWidth` from `startRow` downward, then writes `rows`.
 * Rows 1…(startRow − 1) (e.g. your title row and column headers) stay untouched.
 * When `rows` is empty, only clears stale data below `startRow` (width from `columnWidthFallback`).
 */
export async function clearAndWriteSheetData(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  rows: string[][],
  columnWidthFallback: number
): Promise<void> {
  const colCount =
    rows.length > 0 && rows[0].length > 0 ? rows[0].length : Math.max(1, columnWidthFallback);
  const lastCol = columnLetter(colCount);
  const prefix = sheetRangePrefix(sheetName);

  await client.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: {
      ranges: [`${prefix}!A${startRow}:${lastCol}50000`],
    },
  });

  if (rows.length === 0) return;

  await client.spreadsheets.values.update({
    spreadsheetId,
    range: `${prefix}!A${startRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

/**
 * Overwrites values from row 1. Prefer {@link clearAndWriteSheetData} when you must preserve a title/header layout.
 */
export async function writeSheet(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  rows: string[][]
): Promise<void> {
  if (rows.length === 0) return;

  const lastCol = columnLetter(rows[0].length);
  const lastRow = rows.length;
  const fullRange = `${sheetRangePrefix(sheetName)}!A1:${lastCol}${lastRow}`;

  await client.spreadsheets.values.update({
    spreadsheetId,
    range: fullRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

export function isGoogleSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

/**
 * Read raw cell values (major dimension ROWS). Range is A1 notation, e.g. "Sheet1!A1:ZZ5000".
 */
export async function readSpreadsheetValues(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): Promise<(string | number | boolean | null)[][]> {
  const res = await client.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: 'ROWS',
  });
  const values = res.data.values;
  if (!values || values.length === 0) return [];
  return values as (string | number | boolean | null)[][];
}
