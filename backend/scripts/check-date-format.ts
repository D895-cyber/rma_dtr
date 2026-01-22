// Check date format in both original and fixed files
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

async function checkDateFormat() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Checking Date Format in Files                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const originalData = readExcelFile('rma_cases.xlsx');
  const fixedData = readExcelFile('rma_cases_fixed.xlsx');

  if (originalData.length === 0) {
    console.log('❌ Original file not found or empty');
    return;
  }

  if (fixedData.length === 0) {
    console.log('❌ Fixed file not found or empty');
    return;
  }

  console.log(`📊 Original file rows: ${originalData.length}`);
  console.log(`📊 Fixed file rows: ${fixedData.length}\n`);

  // Check first 5 rows for date format comparison
  console.log('📅 Date Format Comparison (first 5 rows):\n');
  
  for (let i = 0; i < Math.min(5, originalData.length); i++) {
    const orig = originalData[i];
    const fixed = fixedData[i];
    
    console.log(`Row ${i + 2}:`);
    console.log(`  Original rmaRaisedDate: ${orig.rmaRaisedDate} (type: ${typeof orig.rmaRaisedDate})`);
    console.log(`  Fixed rmaRaisedDate:    ${fixed.rmaRaisedDate} (type: ${typeof fixed.rmaRaisedDate})`);
    console.log(`  Original customerErrorDate: ${orig.customerErrorDate} (type: ${typeof orig.customerErrorDate})`);
    console.log(`  Fixed customerErrorDate:    ${fixed.customerErrorDate} (type: ${typeof fixed.customerErrorDate})`);
    console.log('');
  }

  // Check if dates are valid
  let invalidDatesInOriginal = 0;
  let invalidDatesInFixed = 0;

  originalData.forEach((row, idx) => {
    if (row.rmaRaisedDate) {
      const date = new Date(row.rmaRaisedDate);
      if (isNaN(date.getTime())) {
        invalidDatesInOriginal++;
      }
    }
  });

  fixedData.forEach((row, idx) => {
    if (row.rmaRaisedDate) {
      const date = new Date(row.rmaRaisedDate);
      if (isNaN(date.getTime())) {
        invalidDatesInFixed++;
      }
    }
  });

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Date Validation                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`Original file invalid dates: ${invalidDatesInOriginal}`);
  console.log(`Fixed file invalid dates: ${invalidDatesInFixed}\n`);

  // Check date format patterns
  const origDateSample = originalData[0]?.rmaRaisedDate;
  const fixedDateSample = fixedData[0]?.rmaRaisedDate;

  console.log('📋 Date Format Analysis:\n');
  console.log(`Original format example: "${origDateSample}"`);
  console.log(`Fixed format example:    "${fixedDateSample}"\n`);

  if (typeof origDateSample === 'number' && typeof fixedDateSample === 'number') {
    console.log('⚠️  Both are Excel serial numbers (days since 1900-01-01)');
    console.log('   This is normal for Excel files. Dates will be parsed correctly during import.\n');
  } else if (origDateSample !== fixedDateSample) {
    console.log('⚠️  Date format changed! This might affect import.');
    console.log('   Recommendation: Check if dates are still valid and parseable.\n');
  } else {
    console.log('✅ Date format unchanged.\n');
  }
}

checkDateFormat()
  .catch(console.error);
