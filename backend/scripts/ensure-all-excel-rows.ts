// Ensure all 824 Excel rows are imported as separate cases
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

function readExcelFile(filename: string): any[] {
  const filePath = path.join(__dirname, '../data', filename);
  if (!fs.existsSync(filePath)) return [];
  const workbook = XLSX.readFile(filePath);
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
}

function excelDateToJSDate(serial: number | string | Date): Date {
  if (serial instanceof Date) return serial;
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) return parsed;
    const num = parseFloat(serial);
    if (!isNaN(num)) serial = num;
    else throw new Error(`Invalid date: ${serial}`);
  }
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    return new Date(utc_days * 86400 * 1000);
  }
  throw new Error(`Cannot convert date: ${serial}`);
}

async function ensureAllRows() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Ensure All 824 Excel Rows Are Imported                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const excelData = readExcelFile('rma_cases.xlsx');
  const dbCases = await prisma.rmaCase.findMany({
    select: { id: true, callLogNumber: true, rmaNumber: true },
  });

  console.log(`Excel rows: ${excelData.length}`);
  console.log(`Current database cases: ${dbCases.length}\n`);

  // Track which Excel rows have been imported
  const importedRows = new Set<string>();
  const rowsToImport: any[] = [];

  // First, mark rows that have exact matches
  for (const row of excelData) {
    const callLog = row.callLogNumber ? String(row.callLogNumber).trim() : null;
    const rmaNum = row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"' 
      ? String(row.rmaNumber).trim() : null;
    
    const key = `${callLog || 'no-calllog'}_${rmaNum || 'no-rma'}`;
    
    // Check if exact match exists
    const exactMatch = dbCases.find(c => {
      const dbCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
      const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
      return dbCallLog === callLog && dbRmaNum === rmaNum;
    });

    if (exactMatch) {
      // Mark this row as imported (but only once per unique identifier)
      if (!importedRows.has(key)) {
        importedRows.add(key);
      } else {
        // This is a duplicate row that needs a separate case
        rowsToImport.push(row);
      }
    } else {
      // No exact match, needs to be imported
      rowsToImport.push(row);
    }
  }

  console.log(`Rows already imported: ${importedRows.size}`);
  console.log(`Rows to import: ${rowsToImport.length}\n`);

  if (rowsToImport.length === 0) {
    console.log('✅ All rows are already in the database!\n');
    const finalCount = await prisma.rmaCase.count();
    console.log(`Final count: ${finalCount} (Expected: ${excelData.length})\n`);
    return;
  }

  // Import missing rows
  let success = 0;
  let failed = 0;

  for (const row of rowsToImport) {
    try {
      const serialNumber = String(row.serialNumber || '').trim();
      if (!serialNumber) throw new Error('Serial number required');

      const projector = await prisma.projector.findUnique({
        where: { serialNumber },
        include: { projectorModel: true },
      });
      if (!projector) throw new Error(`Projector "${serialNumber}" not found`);

      const audi = await prisma.audi.findFirst({
        where: { projectorId: projector.id },
        include: { site: true },
      });
      if (!audi) throw new Error(`No audi for projector "${serialNumber}"`);

      const creator = await prisma.user.findUnique({
        where: { email: row.createdBy || 'admin@crm.com' },
      });
      if (!creator) throw new Error(`User "${row.createdBy || 'admin@crm.com'}" not found`);

      // Handle duplicates with suffixes
      let callLogNumber = row.callLogNumber ? String(row.callLogNumber).trim() : null;
      if (callLogNumber) {
        let suffix = 0;
        let unique = callLogNumber;
        while (await prisma.rmaCase.findFirst({ where: { callLogNumber: unique } })) {
          suffix++;
          unique = `${callLogNumber}-${suffix}`;
        }
        callLogNumber = unique;
      }

      let rmaNumber = row.rmaNumber ? String(row.rmaNumber).trim() : null;
      if (rmaNumber === '-' || rmaNumber === '' || rmaNumber === '"-"') {
        rmaNumber = null;
      } else if (rmaNumber) {
        let suffix = 0;
        let unique = rmaNumber;
        while (await prisma.rmaCase.findFirst({ where: { rmaNumber: unique } })) {
          suffix++;
          unique = `${rmaNumber}-${suffix}`;
        }
        rmaNumber = unique;
      }

      let rmaType = (row.rmaType || 'RMA').trim();
      rmaType = rmaType.replace('RMA CI', 'RMA_CL').replace('RMA CL', 'RMA_CL');
      if (!['RMA', 'SRMA', 'RMA_CL', 'Lamps'].includes(rmaType)) rmaType = 'RMA';

      const defectivePartNumber = row.defectivePartNumber ? String(row.defectivePartNumber).trim() : null;
      const excelDefectivePartName = row.defectivePartName ? String(row.defectivePartName).trim() : null;
      let defectivePartName = excelDefectivePartName;
      
      if (defectivePartNumber && projector.projectorModelId) {
        const part = await prisma.part.findFirst({
          where: { partNumber: defectivePartNumber, projectorModelId: projector.projectorModelId },
        });
        if (part) defectivePartName = part.partName;
      }

      const rmaData: any = {
        rmaType,
        callLogNumber,
        rmaNumber,
        rmaOrderNumber: row.rmaOrderNumber ? String(row.rmaOrderNumber).trim() : null,
        rmaRaisedDate: excelDateToJSDate(row.rmaRaisedDate),
        customerErrorDate: excelDateToJSDate(row.customerErrorDate),
        siteId: audi.siteId,
        audiId: audi.id,
        productName: projector.projectorModel?.modelNo || row.productName || 'Unknown',
        productPartNumber: row.productPartNumber || null,
        serialNumber,
        defectDetails: row.defectDetails || null,
        defectivePartName,
        defectivePartNumber,
        defectivePartSerial: row.defectivePartSerial ? String(row.defectivePartSerial).trim() : null,
        isDefectivePartDNR: row.isDefectivePartDNR === true || row.isDefectivePartDNR === 'true' || false,
        replacedPartNumber: row.replacedPartNumber || null,
        replacedPartSerial: row.replacedPartSerial ? String(row.replacedPartSerial).trim() : null,
        symptoms: row.symptoms || null,
        shippingCarrier: row.shippingCarrier ? String(row.shippingCarrier).trim() : null,
        trackingNumberOut: row.trackingNumberOut && row.trackingNumberOut !== '-' && row.trackingNumberOut !== '"-"' 
          ? String(row.trackingNumberOut).trim() : null,
        returnTrackingNumber: row.returnTrackingNumber && row.returnTrackingNumber !== '-' && row.returnTrackingNumber !== '"-"' 
          ? String(row.returnTrackingNumber).trim() : null,
        returnShippedThrough: row.returnShippedThrough || null,
        status: (row.status || 'open').toLowerCase().replace(/\s+/g, '_'),
        createdBy: creator.id,
        notes: row.notes || null,
      };

      if (row.shippedDate) {
        try {
          const d = excelDateToJSDate(row.shippedDate);
          if (!isNaN(d.getTime())) rmaData.shippedDate = d;
        } catch {}
      }

      if (row.returnShippedDate) {
        try {
          const d = excelDateToJSDate(row.returnShippedDate);
          if (!isNaN(d.getTime())) rmaData.returnShippedDate = d;
        } catch {}
      }

      await prisma.rmaCase.create({ data: rmaData });
      success++;
      if (success % 10 === 0) console.log(`   ✅ Progress: ${success}/${rowsToImport.length}...`);
    } catch (error: any) {
      failed++;
      console.log(`❌ Failed: ${row.callLogNumber || 'N/A'} - ${error.message}`);
    }
  }

  const finalCount = await prisma.rmaCase.count();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Final count: ${finalCount}`);
  console.log(`Expected: ${excelData.length}\n`);

  if (finalCount === excelData.length) {
    console.log('🎉 Perfect! All 824 Excel entries are now in the database!\n');
  } else {
    console.log(`⚠️  Difference: ${excelData.length - finalCount} entries\n`);
  }
}

ensureAllRows()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
