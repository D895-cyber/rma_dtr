// Import RMA cases only
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

// Helper function to convert Excel serial date to JavaScript Date
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

// Helper function to read Excel file
function readExcelFile(filename: string): any[] {
  const filePath = path.join(__dirname, '../data', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Import RMA Cases
async function importRMACases(): Promise<ImportStats> {
  console.log('\n📦 Importing RMA Cases...');
  const data = readExcelFile('rma_cases.xlsx');
  const stats: ImportStats = { total: data.length, success: 0, failed: 0, errors: [] };

  for (const row of data) {
    try {
      // Convert serial number to string
      const serialNumber = String(row.serialNumber || '').trim();
      
      if (!serialNumber) {
        throw new Error('Serial number is required');
      }

      // Look up projector by serial number
      let projector = await prisma.projector.findUnique({
        where: { serialNumber: serialNumber },
        include: {
          projectorModel: true,
        },
      });

      if (!projector) {
        throw new Error(`Projector with serial number "${serialNumber}" not found`);
      }

      // Find the audi that has this projector
      const audi = await prisma.audi.findFirst({
        where: { projectorId: projector.id },
        include: { site: true },
      });

      // Audi is optional for RMA, but if the projector is assigned to an audi, we use it
      let audiId: string | undefined = undefined;
      let siteId: string;

      if (audi) {
        audiId = audi.id;
        siteId = audi.siteId;
      } else {
        throw new Error(`No audi found for projector "${serialNumber}"`);
      }

      // Find creator user
      const creator = await prisma.user.findUnique({
        where: { email: row.createdBy || 'admin@crm.com' },
      });

      if (!creator) {
        throw new Error(`User "${row.createdBy || 'admin@crm.com'}" not found`);
      }

      // Find assignee (optional)
      let assigneeId: string | undefined = undefined;
      if (row.assignedTo) {
        const assignee = await prisma.user.findUnique({
          where: { email: row.assignedTo },
        });
        if (assignee) {
          assigneeId = assignee.id;
        }
      }

      // Handle duplicate call log numbers by appending suffix
      let callLogNumber = row.callLogNumber ? String(row.callLogNumber).trim() : null;
      if (callLogNumber) {
        let suffix = 0;
        let uniqueCallLogNumber = callLogNumber;
        
        // Check if call log number already exists
        while (await prisma.rmaCase.findFirst({ where: { callLogNumber: uniqueCallLogNumber } })) {
          suffix++;
          uniqueCallLogNumber = `${callLogNumber}-${suffix}`;
        }
        
        if (suffix > 0) {
          console.log(`   ℹ️  Call Log #${callLogNumber} already exists, using ${uniqueCallLogNumber}`);
        }
        callLogNumber = uniqueCallLogNumber;
      }

      // Handle rmaNumber - check for duplicates and append suffix if duplicate
      let rmaNumber = row.rmaNumber ? String(row.rmaNumber).trim() : null;
      
      // If rmaNumber is "-" or empty, set to null
      if (rmaNumber === '-' || rmaNumber === '' || rmaNumber === '"-"') {
        rmaNumber = null;
      } else if (rmaNumber) {
        // Check if this rmaNumber already exists in database
        let suffix = 0;
        let uniqueRmaNumber = rmaNumber;
        
        while (await prisma.rmaCase.findFirst({ where: { rmaNumber: uniqueRmaNumber } })) {
          suffix++;
          uniqueRmaNumber = `${rmaNumber}-${suffix}`;
        }
        
        if (suffix > 0) {
          console.log(`   ℹ️  RMA number "${rmaNumber}" already exists, using ${uniqueRmaNumber}`);
        }
        rmaNumber = uniqueRmaNumber;
      }

      // Auto-populate part names from parts database based on part numbers
      const defectivePartNumber = row.defectivePartNumber ? String(row.defectivePartNumber).trim() : null;
      const excelDefectivePartName = row.defectivePartName ? String(row.defectivePartName).trim() : null;
      let defectivePartName = excelDefectivePartName;
      
      // If defectivePartNumber is provided, look it up from parts table to get standardized part name
      if (defectivePartNumber && projector.projectorModelId) {
        const part = await prisma.part.findFirst({
          where: {
            partNumber: defectivePartNumber,
            projectorModelId: projector.projectorModelId,
          },
        });
        if (part) {
          defectivePartName = part.partName;
          if (!excelDefectivePartName || excelDefectivePartName !== part.partName) {
            console.log(`   ℹ️  Auto-populated defectivePartName "${part.partName}" for part number "${defectivePartNumber}"`);
          }
        } else if (excelDefectivePartName) {
          defectivePartName = excelDefectivePartName;
        }
      }

      // Normalize RMA type - handle "RMA CL" -> "RMA_CL"
      let rmaType = (row.rmaType || 'RMA').trim();
      rmaType = rmaType.replace('RMA CI', 'RMA_CL').replace('RMA CL', 'RMA_CL');
      if (!['RMA', 'SRMA', 'RMA_CL', 'Lamps'].includes(rmaType)) {
        rmaType = 'RMA'; // Default to RMA if invalid
      }

      const rmaData: any = {
        rmaType: rmaType,
        callLogNumber: callLogNumber,
        rmaNumber: rmaNumber,
        rmaOrderNumber: row.rmaOrderNumber ? String(row.rmaOrderNumber).trim() : null,
        rmaRaisedDate: excelDateToJSDate(row.rmaRaisedDate),
        customerErrorDate: excelDateToJSDate(row.customerErrorDate),
        siteId: siteId,
        productName: projector.projectorModel?.modelNo || row.productName || 'Unknown',
        productPartNumber: row.productPartNumber || null,
        serialNumber: serialNumber,
        defectDetails: row.defectDetails || null,
        defectivePartName: defectivePartName,
        defectivePartNumber: defectivePartNumber,
        defectivePartSerial: row.defectivePartSerial ? String(row.defectivePartSerial).trim() : null,
        isDefectivePartDNR: row.isDefectivePartDNR === true || row.isDefectivePartDNR === 'true' || false,
        defectivePartDNRReason: row.defectivePartDNRReason || null,
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
      
      // Optional fields - only include if they exist
      if (audiId) {
        rmaData.audiId = audiId;
      }
      
      if (assigneeId) {
        rmaData.assignedTo = assigneeId;
      }
      
      // Handle optional date fields - only add if valid
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
      stats.success++;
      
      if (stats.success % 100 === 0) {
        console.log(`   ✅ Progress: ${stats.success}/${stats.total} cases imported...`);
      }
    } catch (error: any) {
      stats.failed++;
      const serialNumber = String(row.serialNumber || 'Unknown').trim();
      stats.errors.push(`RMA "${row.rmaNumber || row.callLogNumber || 'N/A'}" (Serial: ${serialNumber}): ${error.message}`);
      console.log(`❌ Failed: ${row.rmaNumber || row.callLogNumber || 'N/A'} (Serial: ${serialNumber}) - ${error.message}`);
    }
  }

  return stats;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    RMA Cases Import                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  try {
    const stats = await importRMACases();

    // Print summary
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 Import Summary                             ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total: ${stats.total} | ✅ Success: ${stats.success} | ❌ Failed: ${stats.failed}`);
    
    if (stats.errors.length > 0) {
      console.log(`\nErrors (showing first 20):`);
      stats.errors.slice(0, 20).forEach(err => console.log(`  - ${err}`));
      if (stats.errors.length > 20) {
        console.log(`  ... and ${stats.errors.length - 20} more errors`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (stats.failed === 0) {
      console.log('🎉 All RMA cases imported successfully!');
    } else {
      console.log(`⚠️  ${stats.failed} record(s) failed to import. Check errors above.`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
