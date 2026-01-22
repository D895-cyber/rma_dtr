// Fix RMA data issues: status values, RMA types, and rmaNumber placeholders
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

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

// Convert Excel serial number to readable date string (YYYY-MM-DD)
function excelSerialToDateString(serial: number | string | Date | null | undefined): string | null {
  if (!serial && serial !== 0) return null;
  
  // If it's already a Date object
  if (serial instanceof Date) {
    return serial.toISOString().split('T')[0];
  }
  
  // If it's a string, try to parse it
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    // If string parsing failed, try to convert to number
    const num = parseFloat(serial);
    if (!isNaN(num)) {
      serial = num;
    } else {
      return serial; // Return as-is if can't parse
    }
  }
  
  // If it's a number, convert Excel serial date to JS Date
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  
  return String(serial);
}

function writeExcelFile(filename: string, data: any[]) {
  const filePath = path.join(__dirname, '../data', filename);
  
  // Convert date fields to readable format
  const dataWithReadableDates = data.map((row: any) => {
    const newRow = { ...row };
    
    // Convert date fields to readable format
    if (newRow.rmaRaisedDate) {
      const dateStr = excelSerialToDateString(newRow.rmaRaisedDate);
      if (dateStr) newRow.rmaRaisedDate = dateStr;
    }
    
    if (newRow.customerErrorDate) {
      const dateStr = excelSerialToDateString(newRow.customerErrorDate);
      if (dateStr) newRow.customerErrorDate = dateStr;
    }
    
    if (newRow.shippedDate) {
      const dateStr = excelSerialToDateString(newRow.shippedDate);
      if (dateStr) newRow.shippedDate = dateStr;
    }
    
    if (newRow.returnShippedDate) {
      const dateStr = excelSerialToDateString(newRow.returnShippedDate);
      if (dateStr) newRow.returnShippedDate = dateStr;
    }
    
    return newRow;
  });
  
  const worksheet = XLSX.utils.json_to_sheet(dataWithReadableDates);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ Fixed file saved to: ${filePath}`);
}

// Status mapping: Excel values → Database enum values
const statusMapping: Record<string, string> = {
  'closed': 'closed',
  'Closed': 'closed',
  'CLOSED': 'closed',
  'faulty in transit to cds': 'faulty_in_transit_to_cds',
  'Faulty in transit to CDS': 'faulty_in_transit_to_cds',
  'Faulty in transit to cds': 'faulty_in_transit_to_cds',
  'faulty-in-transit-to-cds': 'faulty_in_transit_to_cds',
  'Faulty-in-transit-to-CDS': 'faulty_in_transit_to_cds',
  'rma raised yet to deliver': 'rma_raised_yet_to_deliver',
  'RMA raised Yet to Deliver': 'rma_raised_yet_to_deliver',
  'RMA raised yet to deliver': 'rma_raised_yet_to_deliver',
  'rma-raised-yet-to-deliver': 'rma_raised_yet_to_deliver',
  'RMA-raised-yet-to-deliver': 'rma_raised_yet_to_deliver',
  'open': 'open',
  'Open': 'open',
  'OPEN': 'open',
  'cancelled': 'cancelled',
  'Cancelled': 'cancelled',
  'CANCELLED': 'cancelled',
  // Handle invalid statuses
  'RMA Part return to CDS': 'faulty_in_transit_to_cds', // Map to closest valid status
  'Faulty in transit to Ascomp': 'faulty_in_transit_to_cds', // Map to closest valid status
};

// RMA Type mapping
const rmaTypeMapping: Record<string, string> = {
  'RMA CI': 'RMA_CL',
  'RMA_CI': 'RMA_CL',
  'rma ci': 'RMA_CL',
  'RMA': 'RMA',
  'SRMA': 'SRMA',
  'RMA_CL': 'RMA_CL',
  'RMA CL': 'RMA_CL',
  'Lamps': 'Lamps',
};

async function fixRMADataIssues() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Fixing RMA Data Issues                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const rmaData = readExcelFile('rma_cases_fixed.xlsx');
  
  if (rmaData.length === 0) {
    console.log('❌ No data found in rma_cases_fixed.xlsx');
    console.log('   Trying rma_cases.xlsx instead...\n');
    const altData = readExcelFile('rma_cases.xlsx');
    if (altData.length === 0) {
      console.log('❌ No data found in either file');
      return;
    }
    rmaData.push(...altData);
  }

  console.log(`📊 Total RMA Cases: ${rmaData.length}\n`);

  const fixedData = [...rmaData];
  let statusFixed = 0;
  let typeFixed = 0;
  let rmaNumberFixed = 0;
  const statusChanges: string[] = [];
  const typeChanges: string[] = [];
  const rmaNumberChanges: string[] = [];

  fixedData.forEach((row: any, index: number) => {
    const rowNum = index + 2; // Excel row number (1-based, +1 for header)

    // Fix Status
    if (row.status) {
      const originalStatus = String(row.status).trim();
      const normalizedStatus = originalStatus.toLowerCase();
      
      if (statusMapping[originalStatus] || statusMapping[normalizedStatus]) {
        const newStatus = statusMapping[originalStatus] || statusMapping[normalizedStatus];
        if (newStatus !== normalizedStatus && newStatus !== originalStatus) {
          row.status = newStatus;
          statusFixed++;
          statusChanges.push(`Row ${rowNum}: "${originalStatus}" → "${newStatus}"`);
        }
      } else if (!['open', 'rma_raised_yet_to_deliver', 'faulty_in_transit_to_cds', 'closed', 'cancelled'].includes(normalizedStatus)) {
        // Unknown status - map to closest match or default to 'open'
        const mappedStatus = statusMapping[originalStatus] || 'open';
        row.status = mappedStatus;
        statusFixed++;
        statusChanges.push(`Row ${rowNum}: "${originalStatus}" → "${mappedStatus}" (mapped)`);
      }
    }

    // Fix RMA Type
    if (row.rmaType) {
      const originalType = String(row.rmaType).trim();
      if (rmaTypeMapping[originalType]) {
        const newType = rmaTypeMapping[originalType];
        if (newType !== originalType) {
          row.rmaType = newType;
          typeFixed++;
          typeChanges.push(`Row ${rowNum}: "${originalType}" → "${newType}"`);
        }
      }
    }

    // Fix rmaNumber: Replace "-" with empty
    if (row.rmaNumber) {
      const rmaNum = String(row.rmaNumber).trim();
      if (rmaNum === '-' || rmaNum === '—' || rmaNum === '–') {
        row.rmaNumber = '';
        rmaNumberFixed++;
        rmaNumberChanges.push(`Row ${rowNum}: Removed "-" placeholder`);
      }
    }
  });

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Fix Summary                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Status values fixed: ${statusFixed}`);
  console.log(`✅ RMA Type values fixed: ${typeFixed}`);
  console.log(`✅ rmaNumber placeholders removed: ${rmaNumberFixed}`);
  console.log(`📊 Total rows processed: ${fixedData.length}\n`);

  if (statusChanges.length > 0) {
    console.log('📝 Status Changes (first 20):\n');
    statusChanges.slice(0, 20).forEach(change => console.log(`   ${change}`));
    if (statusChanges.length > 20) {
      console.log(`   ... and ${statusChanges.length - 20} more status changes\n`);
    } else {
      console.log('');
    }
  }

  if (typeChanges.length > 0) {
    console.log('📝 RMA Type Changes:\n');
    typeChanges.forEach(change => console.log(`   ${change}`));
    console.log('');
  }

  if (rmaNumberChanges.length > 0) {
    console.log('📝 rmaNumber Changes (first 20):\n');
    rmaNumberChanges.slice(0, 20).forEach(change => console.log(`   ${change}`));
    if (rmaNumberChanges.length > 20) {
      console.log(`   ... and ${rmaNumberChanges.length - 20} more rmaNumber changes\n`);
    } else {
      console.log('');
    }
  }

  // Save fixed file
  const outputFilename = 'rma_cases_fixed.xlsx';
  writeExcelFile(outputFilename, fixedData);
  
  console.log(`\n✅ All fixes applied and saved to: backend/data/${outputFilename}\n`);
  console.log(`📝 Next steps:`);
  console.log(`   1. Review the fixed file: backend/data/${outputFilename}`);
  console.log(`   2. Run validation script to verify all issues are resolved`);
  console.log(`   3. If everything looks good, replace rma_cases.xlsx with the fixed version\n`);
}

fixRMADataIssues()
  .catch(console.error);
