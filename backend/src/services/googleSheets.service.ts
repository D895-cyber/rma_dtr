import { google, sheets_v4 } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsJson) {
    try {
      const credentials = typeof credentialsJson === 'string'
        ? JSON.parse(credentialsJson) : credentialsJson;
      return new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });
    } catch (e) {
      throw new Error('Invalid GOOGLE_SHEETS_CREDENTIALS_JSON');
    }
  }

  if (credentialsPath) {
    return new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: SCOPES,
    });
  }

  throw new Error(
    'Google Sheets credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS (path to JSON) or GOOGLE_SHEETS_CREDENTIALS_JSON (JSON string).'
  );
}

export function getSheetsClient(): sheets_v4.Sheets {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
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
  const existing = (res.data.sheets || []).map(
    (s) => s.properties?.title || ''
  ).filter(Boolean);

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

/**
 * Clear and write data to a sheet. First row is treated as header.
 * sheetName must match the tab name exactly.
 */
export async function writeSheet(
  client: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  rows: string[][]
): Promise<void> {
  if (rows.length === 0) return;

  const range = `${sheetName}!A1`;
  const lastCol = columnLetter(rows[0].length);
  const lastRow = rows.length;
  const fullRange = `${sheetName}!A1:${lastCol}${lastRow}`;

  await client.spreadsheets.values.update({
    spreadsheetId,
    range: fullRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
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

export function isGoogleSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SHEETS_CREDENTIALS_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}
