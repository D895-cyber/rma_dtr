// Check the rma_cases sheet structure and data
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function readExcelFile(filename: string): { data: any[]; sheetName: string } {
  const filePath = path.join(__dirname, '../data', filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return { data: [], sheetName: '' };
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return { data, sheetName };
}

async function checkRmaSheet() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Checking rma_cases.xlsx Sheet                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Try fixed file first, then original
  let { data, sheetName } = readExcelFile('rma_cases_fixed.xlsx');
  if (data.length === 0) {
    console.log('⚠️  rma_cases_fixed.xlsx not found, trying rma_cases.xlsx...\n');
    const result = readExcelFile('rma_cases.xlsx');
    data = result.data;
    sheetName = result.sheetName;
  }

  if (data.length === 0) {
    console.log('❌ File not found or empty');
    return;
  }

  console.log(`📊 Sheet Name: ${sheetName}`);
  console.log(`📊 Total Rows: ${data.length}\n`);

  // Get column names
  const columns = Object.keys(data[0]);
  console.log('📋 Column Names:');
  columns.forEach((col, idx) => {
    console.log(`   ${idx + 1}. ${col}`);
  });
  console.log(`\n   Total Columns: ${columns.length}\n`);

  // Show first row as sample
  console.log('📄 First Row Sample:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('');

  // Check for required fields based on schema
  const requiredFields = ['rmaType', 'rmaRaisedDate', 'customerErrorDate', 'siteId', 'productName', 'productPartNumber', 'serialNumber'];
  const optionalFields = ['callLogNumber', 'rmaNumber', 'rmaOrderNumber', 'audiId', 'defectDetails', 'defectivePartNumber', 'defectivePartName', 'defectivePartSerial', 'replacedPartNumber', 'replacedPartSerial', 'symptoms', 'shippingCarrier', 'trackingNumberOut', 'shippedDate', 'returnShippedDate', 'returnTrackingNumber', 'returnShippedThrough', 'status', 'assignedTo', 'notes'];

  console.log('🔍 Field Analysis:\n');
  
  const missingRequired: string[] = [];
  const foundFields: string[] = [];
  const extraFields: string[] = [];

  requiredFields.forEach(field => {
    if (columns.includes(field)) {
      foundFields.push(field);
      console.log(`   ✅ ${field} (required)`);
    } else {
      missingRequired.push(field);
      console.log(`   ❌ ${field} (required - MISSING)`);
    }
  });

  optionalFields.forEach(field => {
    if (columns.includes(field)) {
      foundFields.push(field);
      console.log(`   ✓  ${field} (optional)`);
    }
  });

  columns.forEach(col => {
    if (!requiredFields.includes(col) && !optionalFields.includes(col)) {
      extraFields.push(col);
      console.log(`   ⚠️  ${col} (extra field - not in schema)`);
    }
  });

  console.log('');

  // Check data types and sample values
  console.log('📊 Data Type Check (first 5 rows):\n');
  const sampleRows = data.slice(0, 5);
  
  columns.forEach(col => {
    const values = sampleRows.map(row => row[col]).filter(v => v !== undefined && v !== null && v !== '');
    if (values.length > 0) {
      const firstValue = values[0];
      const type = typeof firstValue;
      console.log(`   ${col}: ${type} - Example: "${String(firstValue).substring(0, 50)}${String(firstValue).length > 50 ? '...' : ''}"`);
    } else {
      console.log(`   ${col}: (empty in sample rows)`);
    }
  });

  console.log('');

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  if (missingRequired.length === 0) {
    console.log('✅ All required fields are present!');
  } else {
    console.log(`❌ Missing required fields: ${missingRequired.join(', ')}`);
  }
  
  console.log(`📋 Found fields: ${foundFields.length}`);
  console.log(`⚠️  Extra fields: ${extraFields.length}`);
  
  if (extraFields.length > 0) {
    console.log(`   Extra fields will be ignored during import: ${extraFields.join(', ')}`);
  }

  console.log('');
}

checkRmaSheet()
  .catch(console.error);
