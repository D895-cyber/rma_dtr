// Check RMA Excel file for data quality
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

async function checkRMAExcel() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Checking RMA Excel File Data Quality                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const rmaData = readExcelFile('rma_cases.xlsx');
  const audisData = readExcelFile('audis.xlsx');

  console.log(`📊 RMA Cases in Excel: ${rmaData.length}`);
  console.log(`📊 Audis in Excel: ${audisData.length}\n`);

  // Build serial number map from audis
  const validSerials = new Set<string>();
  audisData.forEach((row: any) => {
    const serial = normalizeSerial(row.serialNumber || row.SerialNumber || row.unitSerial || row.UnitSerial);
    if (serial) {
      validSerials.add(serial);
    }
  });

  console.log(`✅ Valid serial numbers from audis.xlsx: ${validSerials.size}\n`);

  // Check RMA data
  let missingSerials = 0;
  let missingRequiredFields = 0;
  let validCases = 0;
  const issues: string[] = [];

  const requiredFields = ['rmaType', 'rmaRaisedDate', 'customerErrorDate', 'serialNumber', 'productPartNumber'];

  for (let i = 0; i < rmaData.length; i++) {
    const row = rmaData[i];
    const rowNum = i + 2; // Excel row number (1-based, +1 for header)

    // Check required fields
    let hasAllRequired = true;
    for (const field of requiredFields) {
      if (!row[field] && row[field] !== 0) {
        hasAllRequired = false;
        issues.push(`Row ${rowNum}: Missing required field "${field}"`);
        missingRequiredFields++;
        break;
      }
    }

    if (!hasAllRequired) continue;

    // Check serial number
    const serial = normalizeSerial(row.serialNumber);
    if (!serial) {
      issues.push(`Row ${rowNum}: Missing serial number`);
      missingSerials++;
      continue;
    }

    if (!validSerials.has(serial)) {
      issues.push(`Row ${rowNum}: Serial ${serial} not found in audis.xlsx`);
      missingSerials++;
      continue;
    }

    validCases++;
  }

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Validation Results                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Valid Cases: ${validCases}`);
  console.log(`⚠️  Missing Required Fields: ${missingRequiredFields}`);
  console.log(`❌ Missing/Invalid Serial Numbers: ${missingSerials}`);
  console.log(`📊 Total Cases: ${rmaData.length}\n`);

  if (issues.length > 0) {
    console.log('⚠️  Issues Found (showing first 20):\n');
    issues.slice(0, 20).forEach(issue => console.log(`   ${issue}`));
    if (issues.length > 20) {
      console.log(`   ... and ${issues.length - 20} more issues\n`);
    }
  } else {
    console.log('✅ No issues found! All data looks good.\n');
  }

  // Show sample of valid data
  if (validCases > 0) {
    console.log('📋 Sample of valid data (first 3 rows):\n');
    let shown = 0;
    for (let i = 0; i < rmaData.length && shown < 3; i++) {
      const row = rmaData[i];
      const serial = normalizeSerial(row.serialNumber);
      if (serial && validSerials.has(serial)) {
        console.log(`   Row ${i + 2}:`);
        console.log(`      RMA Number: ${row.rmaNumber || 'N/A'}`);
        console.log(`      Serial: ${serial}`);
        console.log(`      Type: ${row.rmaType || 'N/A'}`);
        console.log(`      Status: ${row.status || 'N/A'}`);
        console.log('');
        shown++;
      }
    }
  }
}

checkRMAExcel()
  .catch(console.error);





