// Import missing Excel rows that don't have database matches
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

function readExcelFile(filename: string): any[] {
  const filePath = path.join(__dirname, '../data', filename);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

function excelDateToJSDate(serial: number | string | Date): Date {
  if (serial instanceof Date) {
    return serial;
  }
  
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    const num = parseFloat(serial);
    if (!isNaN(num)) {
      serial = num;
    } else {
      throw new Error(`Invalid date: ${serial}`);
    }
  }
  
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
  }
  
  throw new Error(`Cannot convert date: ${serial}`);
}

async function importMissingRows() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Import Missing Excel Rows                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const excelData = readExcelFile('rma_cases.xlsx');
  const dbCases = await prisma.rmaCase.findMany({
    select: {
      id: true,
      callLogNumber: true,
      rmaNumber: true,
    },
  });

  console.log(`Excel rows: ${excelData.length}`);
  console.log(`Database cases: ${dbCases.length}\n`);

  // Find Excel rows that don't have matches
  const rowsToImport: any[] = [];
  const matchedCaseIds = new Set<string>();

  for (const row of excelData) {
    const callLog = row.callLogNumber ? String(row.callLogNumber).trim() : null;
    const rmaNum = row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"' 
      ? String(row.rmaNumber).trim() : null;

    // Check if this row already has a match
    const matched = dbCases.find(c => {
      const dbCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
      const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
      
      if (callLog && dbCallLog === callLog) {
        if (rmaNum && dbRmaNum) {
          return dbRmaNum === rmaNum;
        }
        return true;
      }
      
      if (rmaNum && dbRmaNum === rmaNum) {
        return true;
      }
      
      return false;
    });

    if (!matched) {
      rowsToImport.push(row);
    } else {
      matchedCaseIds.add(matched.id);
    }
  }

  console.log(`Rows to import: ${rowsToImport.length}`);
  console.log(`Already matched: ${matchedCaseIds.size}\n`);

  if (rowsToImport.length === 0) {
    console.log('✅ All Excel rows already have matches!\n');
    return;
  }

  // Import the missing rows
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rowsToImport) {
    try {
      const serialNumber = String(row.serialNumber || '').trim();
      
      if (!serialNumber) {
        throw new Error('Serial number is required');
      }

      // Look up projector
      const projector = await prisma.projector.findUnique({
        where: { serialNumber: serialNumber },
        include: {
          projectorModel: true,
        },
      });

      if (!projector) {
        throw new Error(`Projector with serial number "${serialNumber}" not found`);
      }

      // Find audi
      const audi = await prisma.audi.findFirst({
        where: { projectorId: projector.id },
        include: { site: true },
      });

      if (!audi) {
        throw new Error(`No audi found for projector "${serialNumber}"`);
      }

      // Find creator
      const creator = await prisma.user.findUnique({
        where: { email: row.createdBy || 'admin@crm.com' },
      });

      if (!creator) {
        throw new Error(`User "${row.createdBy || 'admin@crm.com'}" not found`);
      }

      // Handle callLogNumber with suffix handling
      let callLogNumber = row.callLogNumber ? String(row.callLogNumber).trim() : null;
      if (callLogNumber) {
        let suffix = 0;
        let uniqueCallLogNumber = callLogNumber;
        
        while (await prisma.rmaCase.findFirst({ where: { callLogNumber: uniqueCallLogNumber } })) {
          suffix++;
          uniqueCallLogNumber = `${callLogNumber}-${suffix}`;
        }
        callLogNumber = uniqueCallLogNumber;
      }

      // Handle rmaNumber
      let rmaNumber = row.rmaNumber ? String(row.rmaNumber).trim() : null;
      if (rmaNumber === '-' || rmaNumber === '' || rmaNumber === '"-"') {
        rmaNumber = null;
      } else if (rmaNumber) {
        let suffix = 0;
        let uniqueRmaNumber = rmaNumber;
        
        while (await prisma.rmaCase.findFirst({ where: { rmaNumber: uniqueRmaNumber } })) {
          suffix++;
          uniqueRmaNumber = `${rmaNumber}-${suffix}`;
        }
        rmaNumber = uniqueRmaNumber;
      }

      // Normalize RMA type
      let rmaType = (row.rmaType || 'RMA').trim();
      rmaType = rmaType.replace('RMA CI', 'RMA_CL').replace('RMA CL', 'RMA_CL');
      if (!['RMA', 'SRMA', 'RMA_CL', 'Lamps'].includes(rmaType)) {
        rmaType = 'RMA';
      }

      // Get defective part name
      const defectivePartNumber = row.defectivePartNumber ? String(row.defectivePartNumber).trim() : null;
      const excelDefectivePartName = row.defectivePartName ? String(row.defectivePartName).trim() : null;
      let defectivePartName = excelDefectivePartName;
      
      if (defectivePartNumber && projector.projectorModelId) {
        const part = await prisma.part.findFirst({
          where: {
            partNumber: defectivePartNumber,
            projectorModelId: projector.projectorModelId,
          },
        });
        if (part) {
          defectivePartName = part.partName;
        }
      }

      const rmaData: any = {
        rmaType: rmaType,
        callLogNumber: callLogNumber,
        rmaNumber: rmaNumber,
        rmaOrderNumber: row.rmaOrderNumber ? String(row.rmaOrderNumber).trim() : null,
        rmaRaisedDate: excelDateToJSDate(row.rmaRaisedDate),
        customerErrorDate: excelDateToJSDate(row.customerErrorDate),
        siteId: audi.siteId,
        audiId: audi.id,
        productName: projector.projectorModel?.modelNo || row.productName || 'Unknown',
        productPartNumber: row.productPartNumber || null,
        serialNumber: serialNumber,
        defectDetails: row.defectDetails || null,
        defectivePartName: defectivePartName,
        defectivePartNumber: defectivePartNumber,
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
          const shippedDate = excelDateToJSDate(row.shippedDate);
          if (!isNaN(shippedDate.getTime())) {
            rmaData.shippedDate = shippedDate;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }

      if (row.returnShippedDate) {
        try {
          const returnDate = excelDateToJSDate(row.returnShippedDate);
          if (!isNaN(returnDate.getTime())) {
            rmaData.returnShippedDate = returnDate;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }

      await prisma.rmaCase.create({
        data: rmaData,
      });

      success++;
      if (success % 10 === 0) {
        console.log(`   ✅ Progress: ${success}/${rowsToImport.length} imported...`);
      }
    } catch (error: any) {
      failed++;
      const callLog = row.callLogNumber ? String(row.callLogNumber).trim() : 'N/A';
      errors.push(`CallLog ${callLog}: ${error.message}`);
      console.log(`❌ Failed: CallLog ${callLog} - ${error.message}`);
    }
  }

  const finalCount = await prisma.rmaCase.count();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`Rows to import: ${rowsToImport.length}`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Final database count: ${finalCount}`);
  console.log(`Expected: ${excelData.length}\n`);

  if (finalCount === excelData.length) {
    console.log('✅ Perfect! All 824 Excel entries are now in the database!\n');
  } else {
    console.log(`⚠️  Still ${excelData.length - finalCount} entries missing.\n`);
  }

  if (errors.length > 0 && errors.length <= 20) {
    console.log('Errors:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
}

importMissingRows()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
