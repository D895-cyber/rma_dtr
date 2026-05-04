import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import {
  getSheetsClient,
  ensureSheetsExist,
  clearAndWriteSheetData,
  readSpreadsheetValues,
  isGoogleSheetsConfigured,
} from '../services/googleSheets.service';
import { stripSerialSuffix } from '../utils/serialNumber.util';
import { parseTwoHeaderRowsDataFromRow3 } from '../utils/sheetTwoRowHeader.util';

const MAX_ROWS_PER_SHEET = 5000;
const SHEET_NAMES = ['RMA Cases', 'DTR Cases'];

/** First sheet row where CRM writes RMA data (default 3: row 1 title, row 2 headers you manage). */
function parseDataStartRow(envName: string, defaultRow: number): number {
  const raw = process.env[envName]?.trim();
  if (!raw) return defaultRow;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return defaultRow;
  return n;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function safeStr(val: unknown): string {
  if (val == null) return '';
  return String(val);
}

/**
 * POST /api/sync/google-sheet
 * Pushes RMA and DTR case rows into the configured Google Sheet.
 * Does not overwrite your title/header rows: clears and rewrites only from
 * GOOGLE_SHEET_RMA_DATA_START_ROW / GOOGLE_SHEET_DTR_DATA_START_ROW (default row 3).
 * Requires manager or admin. Configure GOOGLE_SHEET_ID and credentials.
 */
export async function syncToGoogleSheet(req: AuthRequest, res: Response) {
  try {
    if (!isGoogleSheetsConfigured()) {
      return sendError(
        res,
        'Google Sheets sync is not configured. Set GOOGLE_SHEET_ID and credentials (GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SHEETS_CREDENTIALS_JSON).',
        503
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();
    if (!spreadsheetId) {
      return sendError(
        res,
        'GOOGLE_SHEET_ID is not set. Add it to your environment.',
        503
      );
    }

    const client = await getSheetsClient();
    await ensureSheetsExist(client, spreadsheetId, SHEET_NAMES);

    // Fetch RMA cases (no pagination for full export, but cap for safety)
    const rmaCases = await prisma.rmaCase.findMany({
      take: MAX_ROWS_PER_SHEET,
      orderBy: { createdAt: 'desc' },
      include: {
        site: true,
        audi: { select: { audiNo: true } },
        creator: { select: { email: true, name: true } },
      },
    });

    /** Column order must match the headers you keep on the tab (sync does not write title/headers). */
    const rmaHeaders = [
      'S. No.',
      'Type',
      'Call Log #',
      'RMA #',
      'RMA Order #',
      'RMA Raised Date',
      'Customer Error Date',
      'Site',
      'Audi',
      'Product Name',
      'Part Number',
      'Serial Number',
      'Defective Part Number',
      'Defective Part Name',
      'Defective Part Serial',
      'Symptoms',
      'Replaced Part Number',
      'Replaced Part Serial',
      'Shipped Date',
      'Tracking Number (Out)',
      'Shipping Carrier',
      'Notes',
      'Created By',
      'Status',
      'RMA Return Shipped Date',
      'RMA Return Tracking #',
      'Return Shipped Through',
    ];
    const rmaDataStartRow = parseDataStartRow('GOOGLE_SHEET_RMA_DATA_START_ROW', 3);

    const rmaRows: string[][] = [];
    let rmaSerial = 0;
    for (const c of rmaCases) {
      rmaSerial += 1;
      rmaRows.push([
        String(rmaSerial),
        c.rmaType,
        stripSerialSuffix(safeStr(c.callLogNumber)),
        stripSerialSuffix(safeStr(c.rmaNumber)),
        safeStr(c.rmaOrderNumber),
        formatDate(c.rmaRaisedDate),
        formatDate(c.customerErrorDate),
        c.site?.siteName ?? '',
        c.audi?.audiNo ?? '',
        c.productName,
        c.productPartNumber,
        stripSerialSuffix(c.serialNumber),
        safeStr(c.defectivePartNumber),
        safeStr(c.defectivePartName),
        stripSerialSuffix(safeStr(c.defectivePartSerial)),
        safeStr(c.symptoms),
        safeStr(c.replacedPartNumber),
        stripSerialSuffix(safeStr(c.replacedPartSerial)),
        formatDate(c.shippedDate),
        safeStr(c.trackingNumberOut),
        safeStr(c.shippingCarrier),
        safeStr(c.notes),
        c.creator ? `${c.creator.name}` : '',
        c.status,
        formatDate(c.returnShippedDate),
        safeStr(c.returnTrackingNumber),
        safeStr(c.returnShippedThrough),
      ]);
    }

    await clearAndWriteSheetData(
      client,
      spreadsheetId,
      SHEET_NAMES[0],
      rmaDataStartRow,
      rmaRows,
      rmaHeaders.length
    );

    // Fetch DTR cases
    const dtrCases = await prisma.dtrCase.findMany({
      take: MAX_ROWS_PER_SHEET,
      orderBy: { createdAt: 'desc' },
      include: {
        site: true,
        assignee: { select: { email: true, name: true } },
        closer: { select: { email: true, name: true } },
      },
    });

    /** Column order must match manual headers above `dtrDataStartRow`. */
    const dtrHeaders = [
      'Id',
      'Case Number',
      'Error Date',
      'Site',
      'Unit Model',
      'Unit Serial',
      'Nature of Problem',
      'Call Status',
      'Severity',
      'Assigned To',
      'Closed By',
      'Closed Date',
      'Created At',
    ];
    const dtrDataStartRow = parseDataStartRow('GOOGLE_SHEET_DTR_DATA_START_ROW', 3);

    const dtrRows: string[][] = [];
    for (const c of dtrCases) {
      dtrRows.push([
        c.id,
        stripSerialSuffix(c.caseNumber),
        formatDate(c.errorDate),
        c.site?.siteName ?? '',
        c.unitModel,
        stripSerialSuffix(c.unitSerial),
        safeStr(c.natureOfProblem),
        c.callStatus,
        c.caseSeverity,
        c.assignee ? `${c.assignee.name} (${c.assignee.email})` : '',
        c.closer ? `${c.closer.name} (${c.closer.email})` : '',
        formatDate(c.closedDate),
        c.createdAt.toISOString(),
      ]);
    }

    await clearAndWriteSheetData(
      client,
      spreadsheetId,
      SHEET_NAMES[1],
      dtrDataStartRow,
      dtrRows,
      dtrHeaders.length
    );

    const syncedAt = new Date().toISOString();

    return sendSuccess(res, {
      rmaRows: rmaRows.length,
      dtrRows: dtrRows.length,
      spreadsheetId,
      syncedAt,
      syncedBy: req.user
        ? {
            email: req.user.email,
            role: req.user.role,
          }
        : null,
    }, 'Google Sheet synced successfully.');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error('Google Sheet sync error:', error);
    return sendError(res, `Failed to sync to Google Sheet: ${message}`, 500);
  }
}

/**
 * GET /api/sync/google-sheet/status
 * Returns whether Google Sheets sync is configured (no credentials in response).
 */
export async function getSyncStatus(_req: AuthRequest, res: Response) {
  try {
    const configured = isGoogleSheetsConfigured() && !!process.env.GOOGLE_SHEET_ID?.trim();
    return sendSuccess(res, {
      configured,
      sheetIdSet: !!process.env.GOOGLE_SHEET_ID?.trim(),
    });
  } catch (error: unknown) {
    console.error('Sync status error:', error);
    return sendError(res, 'Failed to get sync status', 500);
  }
}

const DEFAULT_READ_RANGE = 'A1:ZZ5000';

/**
 * GET /api/sync/google-sheet/read
 * Reads a tab using rows 1–2 as headers and row 3+ as data rows; returns JSON records.
 *
 * Query: sheetName (required) — tab name, e.g. "Sheet1" or "RMA Cases"
 *        spreadsheetId (optional) — defaults to GOOGLE_SHEET_ID
 *        range (optional) — A1 suffix only, e.g. "A1:BA200"; default A1:ZZ5000 (combined with sheet name)
 */
export async function readGoogleSheetTwoRowHeaders(req: AuthRequest, res: Response) {
  try {
    if (!isGoogleSheetsConfigured()) {
      return sendError(
        res,
        'Google Sheets is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SHEETS_CREDENTIALS_JSON.',
        503
      );
    }

    const sheetName = typeof req.query.sheetName === 'string' ? req.query.sheetName.trim() : '';
    if (!sheetName) {
      return sendError(res, 'Query parameter sheetName is required (Google Sheet tab name).', 400);
    }

    const envId = process.env.GOOGLE_SHEET_ID?.trim();
    const spreadsheetId =
      typeof req.query.spreadsheetId === 'string' && req.query.spreadsheetId.trim()
        ? req.query.spreadsheetId.trim()
        : envId;

    if (!spreadsheetId) {
      return sendError(
        res,
        'spreadsheetId query param or GOOGLE_SHEET_ID env must be set.',
        400
      );
    }

    let rangeSuffix =
      typeof req.query.range === 'string' && req.query.range.trim()
        ? req.query.range.trim()
        : DEFAULT_READ_RANGE;

    if (!/^[A-Za-z]+[0-9]+(:[A-Za-z]+[0-9]+)?$/.test(rangeSuffix)) {
      return sendError(
        res,
        'range must be A1 notation only (e.g. A1:ZZ500), without the sheet name.',
        400
      );
    }

    const escapedName = sheetName.replace(/'/g, "''");
    const quotedTab = `'${escapedName}'`;
    const a1Range = `${quotedTab}!${rangeSuffix}`;

    const client = await getSheetsClient();
    const values = await readSpreadsheetValues(client, spreadsheetId, a1Range);
    const parsed = parseTwoHeaderRowsDataFromRow3(values);

    return sendSuccess(
      res,
      {
        spreadsheetId,
        sheetName,
        range: a1Range,
        columnKeys: parsed.columnKeys,
        headerRow1: parsed.headerRow1,
        headerRow2: parsed.headerRow2,
        row1IgnoredAsBanner: parsed.row1IgnoredAsBanner,
        rowCount: parsed.rows.length,
        rows: parsed.rows,
      },
      'Sheet parsed with two header rows.'
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Read failed';
    console.error('Google Sheet read error:', error);
    return sendError(res, `Failed to read Google Sheet: ${message}`, 500);
  }
}
