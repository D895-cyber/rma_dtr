import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import {
  getSheetsClient,
  ensureSheetsExist,
  writeSheet,
  readSpreadsheetValues,
  isGoogleSheetsConfigured,
} from '../services/googleSheets.service';
import { stripSerialSuffix } from '../utils/serialNumber.util';
import { parseTwoHeaderRowsDataFromRow3 } from '../utils/sheetTwoRowHeader.util';

const MAX_ROWS_PER_SHEET = 5000;
const SHEET_NAMES = ['RMA Cases', 'DTR Cases'];

/** Row 1 banner (optional via env); row 2 = headers; row 3+ = data — matches two-row header templates. */
function bannerRow(title: string, columnCount: number): string[] {
  if (columnCount <= 0) return [title];
  return [title, ...Array(columnCount - 1).fill('')];
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
 * Pushes current RMA and DTR data to the configured Google Sheet (two tabs).
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
        assignee: { select: { email: true, name: true } },
      },
    });

    const rmaHeaders = [
      'Id',
      'Call Log #',
      'RMA #',
      'RMA Order #',
      'Type',
      'Status',
      'RMA Raised Date',
      'Customer Error Date',
      'Site',
      'Audi',
      'Product Name',
      'Part Number',
      'Serial Number',
      'Defect Details',
      'Defective Part Name',
      'Defective Part Number',
      'Defective Part Serial',
      'Defective Part DNR',
      'Defective Part DNR Reason',
      'Replaced Part Number',
      'Replaced Part Serial',
      'Symptoms',
      'Shipping Carrier',
      'Tracking Number (Out)',
      'Shipped Date',
      'Return Shipped Date',
      'Return Tracking Number',
      'Return Shipped Through',
      'Assigned To',
      'Created By',
      'Notes',
      'Created At',
      'Updated At',
    ];
    const rmaBannerText =
      process.env.GOOGLE_SHEET_RMA_BANNER?.trim() ||
      'RMA Cases — CRM sync (row 1 title · row 2 headers · data from row 3)';
    const rmaRows: string[][] = [
      bannerRow(rmaBannerText, rmaHeaders.length),
      rmaHeaders,
    ];
    for (const c of rmaCases) {
      rmaRows.push([
        c.id,
        stripSerialSuffix(safeStr(c.callLogNumber)),
        stripSerialSuffix(safeStr(c.rmaNumber)),
        safeStr(c.rmaOrderNumber),
        c.rmaType,
        c.status,
        formatDate(c.rmaRaisedDate),
        formatDate(c.customerErrorDate),
        c.site?.siteName ?? '',
        c.audi?.audiNo ?? '',
        c.productName,
        c.productPartNumber,
        stripSerialSuffix(c.serialNumber),
        safeStr(c.defectDetails),
        safeStr(c.defectivePartName),
        safeStr(c.defectivePartNumber),
        stripSerialSuffix(safeStr(c.defectivePartSerial)),
        safeStr(c.isDefectivePartDNR),
        safeStr(c.defectivePartDNRReason),
        safeStr(c.replacedPartNumber),
        stripSerialSuffix(safeStr(c.replacedPartSerial)),
        safeStr(c.symptoms),
        safeStr(c.shippingCarrier),
        safeStr(c.trackingNumberOut),
        formatDate(c.shippedDate),
        formatDate(c.returnShippedDate),
        safeStr(c.returnTrackingNumber),
        safeStr(c.returnShippedThrough),
        c.assignee ? `${c.assignee.name} (${c.assignee.email})` : '',
        c.creator ? `${c.creator.name} (${c.creator.email})` : '',
        safeStr(c.notes),
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
      ]);
    }

    await writeSheet(client, spreadsheetId, SHEET_NAMES[0], rmaRows);

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
    const dtrBannerText =
      process.env.GOOGLE_SHEET_DTR_BANNER?.trim() ||
      'DTR Cases — CRM sync (row 1 title · row 2 headers · data from row 3)';
    const dtrRows: string[][] = [
      bannerRow(dtrBannerText, dtrHeaders.length),
      dtrHeaders,
    ];
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

    await writeSheet(client, spreadsheetId, SHEET_NAMES[1], dtrRows);

    const syncedAt = new Date().toISOString();

    return sendSuccess(res, {
      rmaRows: rmaRows.length - 2,
      dtrRows: dtrRows.length - 2,
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
