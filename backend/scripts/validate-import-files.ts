// Validate Excel files for import readiness

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const partsFile = path.join(__dirname, '../data', 'parts.xlsx');
const rmaFile = path.join(__dirname, '../data', 'rma_cases.xlsx');
const dtrFile = path.join(__dirname, '../data', 'dtr_cases.xlsx');

console.log('📊 Excel Files Import Readiness Check');
console.log('═══════════════════════════════════════════════════════\n');

if (!fs.existsSync(partsFile)) {
  console.log('❌ Parts file not found:', partsFile);
  process.exit(1);
}

if (!fs.existsSync(rmaFile)) {
  console.log('❌ RMA cases file not found:', rmaFile);
  process.exit(1);
}

if (!fs.existsSync(dtrFile)) {
  console.log('❌ DTR cases file not found:', dtrFile);
  process.exit(1);
}

const partsWorkbook = XLSX.readFile(partsFile);
const partsData = XLSX.utils.sheet_to_json(partsWorkbook.Sheets[partsWorkbook.SheetNames[0]]);

const rmaWorkbook = XLSX.readFile(rmaFile);
const rmaData = XLSX.utils.sheet_to_json(rmaWorkbook.Sheets[rmaWorkbook.SheetNames[0]]);

const dtrWorkbook = XLSX.readFile(dtrFile);
const dtrData = XLSX.utils.sheet_to_json(dtrWorkbook.Sheets[dtrWorkbook.SheetNames[0]]);

// 1. PARTS.XLSX ANALYSIS
console.log('1️⃣  PARTS.XLSX ANALYSIS\n');
console.log('Total parts:', partsData.length);

if (partsData.length > 0) {
  const headers = Object.keys(partsData[0] as any);
  console.log('Columns:', headers.join(', '));
  
  const requiredPartsFields = ['partName', 'partNumber', 'modelNo'];
  const missingPartsFields = requiredPartsFields.filter(f => !headers.includes(f));
  
  if (missingPartsFields.length > 0) {
    console.log('❌ Missing required columns:', missingPartsFields.join(', '));
  } else {
    console.log('✅ All required columns present');
  }
  
  console.log('\nSample data (first 3 rows):');
  partsData.slice(0, 3).forEach((row: any, idx: number) => {
    console.log(`\n  Row ${idx + 1}:`);
    requiredPartsFields.forEach(f => {
      console.log(`    ${f}:`, (row as any)[f] || '(empty)');
    });
  });
  
  const partNumbers = partsData.map((p: any) => String((p as any).partNumber).trim()).filter((p: string) => p);
  const uniquePartNumbers = [...new Set(partNumbers)];
  console.log('\n  Unique part numbers:', uniquePartNumbers.length);
  
  const duplicatePartNumbers = partNumbers.filter((val: string, idx: number) => partNumbers.indexOf(val) !== idx);
  if (duplicatePartNumbers.length > 0) {
    console.log('  ⚠️  Duplicate part numbers:', duplicatePartNumbers.length, '(same part for different models - OK)');
  } else {
    console.log('  ✅ No duplicate part numbers');
  }
}

// 2. RMA_CASES.XLSX ANALYSIS
console.log('\n2️⃣  RMA_CASES.XLSX ANALYSIS\n');
console.log('Total RMA records:', rmaData.length);

const rmaHeaders = Object.keys((rmaData[0] as any) || {});
console.log('Columns:', rmaHeaders.length, 'columns');

const requiredRmaFields = ['serialNumber', 'rmaRaisedDate', 'customerErrorDate', 'status', 'createdBy'];
const missingRmaFields = requiredRmaFields.filter(f => !rmaHeaders.includes(f));

if (missingRmaFields.length > 0) {
  console.log('❌ Missing required columns:', missingRmaFields.join(', '));
} else {
  console.log('✅ All required columns present');
}

const rmaPartNumbers = rmaData
  .filter((r: any) => r.defectivePartNumber)
  .map((r: any) => String(r.defectivePartNumber).trim());
const uniqueRmaPartNumbers = [...new Set(rmaPartNumbers)];

console.log('\n  Records with defectivePartNumber:', rmaPartNumbers.length);
console.log('  Unique defectivePartNumbers:', uniqueRmaPartNumbers.length);

// 3. DTR_CASES.XLSX ANALYSIS
console.log('\n3️⃣  DTR_CASES.XLSX ANALYSIS\n');
console.log('Total DTR records:', dtrData.length);

const dtrHeaders = Object.keys((dtrData[0] as any) || {});
console.log('Columns:', dtrHeaders.length, 'columns');

// Required DTR fields based on simplified import guide
const requiredDtrFields = ['caseNumber', 'errorDate', 'serialNumber', 'natureOfProblem', 'callStatus', 'caseSeverity', 'createdBy'];
const missingDtrFields = requiredDtrFields.filter(f => !dtrHeaders.includes(f));

if (missingDtrFields.length > 0) {
  console.log('❌ Missing required columns:', missingDtrFields.join(', '));
} else {
  console.log('✅ All required columns present');
}

if (dtrData.length > 0) {
  // Show sample of key required fields
  console.log('\nSample data (first 3 rows):');
  dtrData.slice(0, 3).forEach((row: any, idx: number) => {
    console.log(`\n  Row ${idx + 1}:`);
    requiredDtrFields.forEach(f => {
      console.log(`    ${f}:`, (row as any)[f] ?? '(empty)');
    });
  });

  // Unique callStatus values
  const callStatuses = [...new Set(dtrData.map((r: any) => (r.callStatus ? String(r.callStatus).trim() : '(empty)')))];
  console.log('\n  Unique callStatus values:', callStatuses.length);
  console.log('  Values:', callStatuses.join(', '));

  // Unique caseSeverity values
  const severities = [...new Set(dtrData.map((r: any) => (r.caseSeverity ? String(r.caseSeverity).trim() : '(empty)')))];
  console.log('\n  Unique caseSeverity values:', severities.length);
  console.log('  Values:', severities.join(', '));
}

// 4. COMPATIBILITY CHECK (RMA ↔ PARTS)
console.log('\n4️⃣  COMPATIBILITY CHECK (RMA ↔ PARTS)\n');

if (partsData.length > 0 && rmaData.length > 0) {
  const partsPartNumbers = partsData.map((p: any) => String(p.partNumber).trim()).filter((p: string) => p);
  const matchingParts = uniqueRmaPartNumbers.filter((rpn: string) => partsPartNumbers.includes(rpn));
  const missingParts = uniqueRmaPartNumbers.filter((rpn: string) => !partsPartNumbers.includes(rpn));
  
  console.log('  Part numbers in RMA that exist in parts database:', matchingParts.length);
  console.log('  Part numbers in RMA NOT in parts database:', missingParts.length);
  
  if (missingParts.length > 0) {
    console.log('\n  ⚠️  Missing part numbers (will use Excel values):');
    missingParts.slice(0, 10).forEach((pn: string) => {
      console.log(`    - ${pn}`);
    });
    if (missingParts.length > 10) {
      console.log(`    ... and ${missingParts.length - 10} more`);
    }
  }
  
  const rmasWithMatchingParts = rmaData.filter((r: any) => {
    const pn = r.defectivePartNumber ? String(r.defectivePartNumber).trim() : null;
    return pn && partsPartNumbers.includes(pn);
  }).length;
  
  const rmasWithMissingParts = rmaData.filter((r: any) => {
    const pn = r.defectivePartNumber ? String(r.defectivePartNumber).trim() : null;
    return pn && !partsPartNumbers.includes(pn);
  }).length;
  
  console.log(`\n  RMA records with matching parts: ${rmasWithMatchingParts} (${((rmasWithMatchingParts/rmaData.length)*100).toFixed(1)}%)`);
  console.log(`  RMA records with missing parts: ${rmasWithMissingParts} (${((rmasWithMissingParts/rmaData.length)*100).toFixed(1)}%)`);
}

// 5. FINAL STATUS
console.log('\n5️⃣  FINAL STATUS\n');

const requiredPartsFields = ['partName', 'partNumber', 'modelNo'];
const requiredRmaFieldsCheck = ['serialNumber', 'rmaRaisedDate', 'customerErrorDate', 'status', 'createdBy'];

const partsReady = partsData.length > 0 && requiredPartsFields.every(f => Object.keys((partsData[0] as any) || {}).includes(f));
const rmaReady = rmaData.length > 0 && requiredRmaFieldsCheck.every(f => rmaHeaders.includes(f));
const dtrReady = dtrData.length > 0 && requiredDtrFields.every(f => dtrHeaders.includes(f));

console.log('  Parts file ready:', partsReady ? '✅ YES' : '❌ NO');
console.log('  RMA cases file ready:', rmaReady ? '✅ YES' : '❌ NO');
console.log('  DTR cases file ready:', dtrReady ? '✅ YES' : '❌ NO');

if (partsReady && rmaReady && dtrReady) {
  console.log('\n  🎉 ALL FILES ARE READY FOR IMPORT!');
  console.log('\n  ✅ Parts will be imported first');
  console.log('  ✅ RMA cases will use parts database for auto-population');
  console.log('  ✅ DTR cases will auto-link to projectors/audis/sites via serial number');
  console.log('  ✅ Missing parts will use Excel values as fallback');
} else {
  console.log('\n  ⚠️  Some files need attention before import');
}

