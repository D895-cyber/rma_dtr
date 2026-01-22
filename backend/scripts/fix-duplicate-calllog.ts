// Fix duplicate callLogNumber by adding count suffix
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
    // Excel dates are stored as days since 1900-01-01
    // JavaScript dates use milliseconds since 1970-01-01
    const utc_days = Math.floor(serial - 25569); // 25569 is the offset between Excel epoch and Unix epoch
    const utc_value = utc_days * 86400; // Convert days to seconds
    const date_info = new Date(utc_value * 1000); // Convert to milliseconds
    return date_info.toISOString().split('T')[0]; // Return as YYYY-MM-DD
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

async function fixDuplicateCallLogNumbers() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Fixing Duplicate callLogNumber Values                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const rmaData = readExcelFile('rma_cases.xlsx');
  
  if (rmaData.length === 0) {
    console.log('❌ No data found in rma_cases.xlsx');
    return;
  }

  console.log(`📊 Total RMA Cases: ${rmaData.length}\n`);

  // Track callLogNumber occurrences
  const callLogCounts = new Map<string, number>();
  const fixedData = [...rmaData];
  let fixedCount = 0;

  // First pass: count occurrences
  fixedData.forEach((row: any) => {
    if (row.callLogNumber) {
      const callLog = String(row.callLogNumber).trim();
      if (callLog) {
        callLogCounts.set(callLog, (callLogCounts.get(callLog) || 0) + 1);
      }
    }
  });

  // Second pass: fix duplicates by adding suffix
  const seenCallLogs = new Map<string, number>();
  
  fixedData.forEach((row: any, index: number) => {
    if (row.callLogNumber) {
      const originalCallLog = String(row.callLogNumber).trim();
      
      if (originalCallLog) {
        const count = callLogCounts.get(originalCallLog) || 0;
        
        // If duplicate exists, add suffix
        if (count > 1) {
          const seenCount = seenCallLogs.get(originalCallLog) || 0;
          
          if (seenCount === 0) {
            // Keep first occurrence as is
            seenCallLogs.set(originalCallLog, 1);
          } else {
            // Add suffix to subsequent occurrences
            const newCallLog = `${originalCallLog}-${seenCount}`;
            row.callLogNumber = newCallLog;
            seenCallLogs.set(originalCallLog, seenCount + 1);
            fixedCount++;
            console.log(`   Row ${index + 2}: "${originalCallLog}" → "${newCallLog}"`);
          }
        }
      }
    }
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Fix Summary                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Fixed ${fixedCount} duplicate callLogNumber values`);
  console.log(`📊 Total rows processed: ${fixedData.length}\n`);

  // Verify no duplicates remain
  const finalCallLogs = new Set<string>();
  let remainingDuplicates = 0;
  
  fixedData.forEach((row: any) => {
    if (row.callLogNumber) {
      const callLog = String(row.callLogNumber).trim();
      if (callLog) {
        if (finalCallLogs.has(callLog)) {
          remainingDuplicates++;
        } else {
          finalCallLogs.add(callLog);
        }
      }
    }
  });

  if (remainingDuplicates > 0) {
    console.log(`⚠️  Warning: ${remainingDuplicates} duplicates still remain after fix\n`);
  } else {
    console.log('✅ All callLogNumber values are now unique!\n');
  }

  // Save fixed file
  const outputFilename = 'rma_cases_fixed.xlsx';
  writeExcelFile(outputFilename, fixedData);
  
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the fixed file: backend/data/${outputFilename}`);
  console.log(`   2. If everything looks good, replace rma_cases.xlsx with the fixed version`);
  console.log(`   3. Run the validation script again to verify\n`);
}

fixDuplicateCallLogNumbers()
  .catch(console.error);
