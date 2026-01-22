// Comprehensive RMA Excel file validation
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

function normalizeSerial(serial: string | number | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

function isValidDate(dateStr: any): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

async function comprehensiveRMACheck() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Comprehensive RMA Excel File Data Validation            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const rmaData = readExcelFile('rma_cases.xlsx');
  const audisData = readExcelFile('audis.xlsx');

  console.log(`📊 RMA Cases in Excel: ${rmaData.length}`);
  console.log(`📊 Audis in Excel: ${audisData.length}\n`);

  // Valid enums
  const validRmaTypes = ['RMA', 'SRMA', 'RMA_CL', 'RMA CL', 'Lamps'];
  const validStatuses = ['open', 'rma_raised_yet_to_deliver', 'rma-raised-yet-to-deliver', 
                         'faulty_in_transit_to_cds', 'faulty-in-transit-to-cds', 
                         'closed', 'cancelled'];

  // Build serial number map from audis
  const validSerials = new Set<string>();
  audisData.forEach((row: any) => {
    const serial = normalizeSerial(row.serialNumber || row.SerialNumber || row.unitSerial || row.UnitSerial);
    if (serial) {
      validSerials.add(serial);
    }
  });

  console.log(`✅ Valid serial numbers from audis.xlsx: ${validSerials.size}\n`);

  // Validation tracking
  const issues: string[] = [];
  const warnings: string[] = [];
  let validCases = 0;
  const callLogNumbers = new Map<string, number>(); // Track duplicates
  const rmaNumbers = new Map<string, number>(); // Track duplicates

  const requiredFields = ['rmaType', 'rmaRaisedDate', 'customerErrorDate', 'serialNumber', 'productPartNumber'];

  for (let i = 0; i < rmaData.length; i++) {
    const row = rmaData[i];
    const rowNum = i + 2; // Excel row number (1-based, +1 for header)
    let rowValid = true;

    // Check required fields
    for (const field of requiredFields) {
      if (!row[field] && row[field] !== 0) {
        issues.push(`Row ${rowNum}: Missing required field "${field}"`);
        rowValid = false;
        break;
      }
    }

    if (!rowValid) continue;

    // Check RMA Type
    const rmaType = row.rmaType?.toString().trim();
    if (rmaType && !validRmaTypes.includes(rmaType)) {
      warnings.push(`Row ${rowNum}: Invalid RMA Type "${rmaType}". Valid: ${validRmaTypes.join(', ')}`);
    }

    // Check Status
    const status = row.status?.toString().trim().toLowerCase();
    if (status && !validStatuses.includes(status)) {
      warnings.push(`Row ${rowNum}: Invalid Status "${row.status}". Valid: ${validStatuses.join(', ')}`);
    }

    // Check dates
    if (!isValidDate(row.rmaRaisedDate)) {
      issues.push(`Row ${rowNum}: Invalid rmaRaisedDate format: "${row.rmaRaisedDate}"`);
      rowValid = false;
    }

    if (!isValidDate(row.customerErrorDate)) {
      issues.push(`Row ${rowNum}: Invalid customerErrorDate format: "${row.customerErrorDate}"`);
      rowValid = false;
    }

    // Check date logic (customerErrorDate should be <= rmaRaisedDate)
    if (isValidDate(row.rmaRaisedDate) && isValidDate(row.customerErrorDate)) {
      const raisedDate = new Date(row.rmaRaisedDate);
      const errorDate = new Date(row.customerErrorDate);
      if (errorDate > raisedDate) {
        warnings.push(`Row ${rowNum}: customerErrorDate (${row.customerErrorDate}) is after rmaRaisedDate (${row.rmaRaisedDate})`);
      }
    }

    // Check serial number
    const serial = normalizeSerial(row.serialNumber);
    if (!serial) {
      issues.push(`Row ${rowNum}: Missing serial number`);
      rowValid = false;
    } else if (!validSerials.has(serial)) {
      warnings.push(`Row ${rowNum}: Serial ${serial} not found in audis.xlsx`);
    }

    // Check for duplicate call log numbers
    if (row.callLogNumber) {
      const callLog = String(row.callLogNumber).trim();
      if (callLogNumbers.has(callLog)) {
        issues.push(`Row ${rowNum}: Duplicate callLogNumber "${callLog}" (also in row ${callLogNumbers.get(callLog)})`);
      } else {
        callLogNumbers.set(callLog, rowNum);
      }
    }

    // Check for duplicate RMA numbers (warning only, as they might be valid)
    if (row.rmaNumber) {
      const rmaNum = String(row.rmaNumber).trim();
      if (rmaNumbers.has(rmaNum)) {
        warnings.push(`Row ${rowNum}: Duplicate rmaNumber "${rmaNum}" (also in row ${rmaNumbers.get(rmaNum)})`);
      } else {
        rmaNumbers.set(rmaNum, rowNum);
      }
    }

    if (rowValid) {
      validCases++;
    }
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Validation Results                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Valid Cases: ${validCases}`);
  console.log(`❌ Critical Issues: ${issues.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`📊 Total Cases: ${rmaData.length}\n`);

  if (issues.length > 0) {
    console.log('❌ Critical Issues Found (must fix before import):\n');
    issues.slice(0, 30).forEach(issue => console.log(`   ${issue}`));
    if (issues.length > 30) {
      console.log(`   ... and ${issues.length - 30} more critical issues\n`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings (should review):\n');
    warnings.slice(0, 20).forEach(warning => console.log(`   ${warning}`));
    if (warnings.length > 20) {
      console.log(`   ... and ${warnings.length - 20} more warnings\n`);
    }
    console.log('');
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ No issues found! All data looks good for import.\n');
  } else if (issues.length === 0) {
    console.log('✅ No critical issues! Data can be imported (review warnings).\n');
  } else {
    console.log('❌ Please fix critical issues before importing.\n');
  }

  // Show statistics
  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  
  rmaData.forEach((row: any) => {
    const status = row.status?.toString().trim() || 'unknown';
    const type = row.rmaType?.toString().trim() || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  console.log('📊 Data Statistics:\n');
  console.log('Status Distribution:');
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  console.log('\nRMA Type Distribution:');
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  console.log('');
}

comprehensiveRMACheck()
  .catch(console.error);
