import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import {
  getSheetsClient,
  ensureSheetsExist,
  writeSheet,
  isGoogleSheetsConfigured,
} from '../services/googleSheets.service';

const MAX_ROWS_PER_SHEET = 5000;
const SHEET_NAMES = ['RMA Cases', 'DTR Cases'];

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

    const client = getSheetsClient();
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
    const rmaRows: string[][] = [rmaHeaders];
    for (const c of rmaCases) {
      rmaRows.push([
        c.id,
        safeStr(c.callLogNumber),
        safeStr(c.rmaNumber),
        safeStr(c.rmaOrderNumber),
        c.rmaType,
        c.status,
        formatDate(c.rmaRaisedDate),
        formatDate(c.customerErrorDate),
        c.site?.siteName ?? '',
        c.audi?.audiNo ?? '',
        c.productName,
        c.productPartNumber,
        c.serialNumber,
        safeStr(c.defectDetails),
        safeStr(c.defectivePartName),
        safeStr(c.defectivePartNumber),
        safeStr(c.defectivePartSerial),
        safeStr(c.isDefectivePartDNR),
        safeStr(c.defectivePartDNRReason),
        safeStr(c.replacedPartNumber),
        safeStr(c.replacedPartSerial),
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
    const dtrRows: string[][] = [dtrHeaders];
    for (const c of dtrCases) {
      dtrRows.push([
        c.id,
        c.caseNumber,
        formatDate(c.errorDate),
        c.site?.siteName ?? '',
        c.unitModel,
        c.unitSerial,
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
      rmaRows: rmaRows.length - 1,
      dtrRows: dtrRows.length - 1,
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
