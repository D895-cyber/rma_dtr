// Investigate why there are 36 extra cases
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

async function investigate() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Investigating Extra RMA Cases                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Read Excel file
  const excelData = readExcelFile('rma_cases.xlsx');
  console.log(`📄 Excel file rows: ${excelData.length}\n`);

  // Count unique callLogNumbers in Excel
  const excelCallLogs = new Set<string>();
  const excelRmaNumbers = new Set<string>();
  
  excelData.forEach((row: any) => {
    if (row.callLogNumber) {
      excelCallLogs.add(String(row.callLogNumber).trim());
    }
    if (row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"') {
      excelRmaNumbers.add(String(row.rmaNumber).trim());
    }
  });

  console.log(`📊 Excel file:`);
  console.log(`   Unique callLogNumbers: ${excelCallLogs.size}`);
  console.log(`   Unique rmaNumbers: ${excelRmaNumbers.size}\n`);

  // Get all cases from database
  const dbCases = await prisma.rmaCase.findMany({
    select: {
      id: true,
      callLogNumber: true,
      rmaNumber: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`📊 Database:`);
  console.log(`   Total cases: ${dbCases.length}\n`);

  // Check for cases with suffixes that might indicate duplicates
  const casesWithSuffixes = dbCases.filter(c => 
    (c.callLogNumber && c.callLogNumber.includes('-')) ||
    (c.rmaNumber && c.rmaNumber.includes('-'))
  );

  console.log(`📝 Cases with suffixes (duplicate handling): ${casesWithSuffixes.length}\n`);

  // Check if there are duplicate callLogNumbers in Excel
  const callLogCounts = new Map<string, number>();
  excelData.forEach((row: any) => {
    if (row.callLogNumber) {
      const callLog = String(row.callLogNumber).trim();
      callLogCounts.set(callLog, (callLogCounts.get(callLog) || 0) + 1);
    }
  });

  const duplicateCallLogsInExcel = Array.from(callLogCounts.entries())
    .filter(([_, count]) => count > 1);

  if (duplicateCallLogsInExcel.length > 0) {
    console.log(`⚠️  Found ${duplicateCallLogsInExcel.length} duplicate callLogNumbers in Excel:`);
    duplicateCallLogsInExcel.slice(0, 10).forEach(([callLog, count]) => {
      console.log(`   ${callLog}: appears ${count} times`);
    });
    if (duplicateCallLogsInExcel.length > 10) {
      console.log(`   ... and ${duplicateCallLogsInExcel.length - 10} more`);
    }
    console.log('');
  }

  // Check if there are duplicate rmaNumbers in Excel
  const rmaNumberCounts = new Map<string, number>();
  excelData.forEach((row: any) => {
    if (row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"') {
      const rmaNum = String(row.rmaNumber).trim();
      rmaNumberCounts.set(rmaNum, (rmaNumberCounts.get(rmaNum) || 0) + 1);
    }
  });

  const duplicateRmaNumbersInExcel = Array.from(rmaNumberCounts.entries())
    .filter(([_, count]) => count > 1);

  if (duplicateRmaNumbersInExcel.length > 0) {
    console.log(`⚠️  Found ${duplicateRmaNumbersInExcel.length} duplicate rmaNumbers in Excel:`);
    duplicateRmaNumbersInExcel.slice(0, 10).forEach(([rmaNum, count]) => {
      console.log(`   ${rmaNum}: appears ${count} times`);
    });
    if (duplicateRmaNumbersInExcel.length > 10) {
      console.log(`   ... and ${duplicateRmaNumbersInExcel.length - 10} more`);
    }
    console.log('');
  }

  // Calculate expected vs actual
  const expectedCases = excelData.length; // 824
  const actualCases = dbCases.length; // 860
  const difference = actualCases - expectedCases;

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Analysis                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`Expected cases: ${expectedCases} (rows in Excel)`);
  console.log(`Actual cases: ${actualCases} (in database)`);
  console.log(`Difference: ${difference} extra cases\n`);

  if (duplicateCallLogsInExcel.length > 0 || duplicateRmaNumbersInExcel.length > 0) {
    const totalDuplicates = duplicateCallLogsInExcel.reduce((sum, [_, count]) => sum + (count - 1), 0) +
                           duplicateRmaNumbersInExcel.reduce((sum, [_, count]) => sum + (count - 1), 0);
    
    console.log(`📊 Duplicate Analysis:`);
    console.log(`   Duplicate callLogNumbers in Excel: ${duplicateCallLogsInExcel.length} (${duplicateCallLogsInExcel.reduce((sum, [_, count]) => sum + (count - 1), 0)} extra occurrences)`);
    console.log(`   Duplicate rmaNumbers in Excel: ${duplicateRmaNumbersInExcel.length} (${duplicateRmaNumbersInExcel.reduce((sum, [_, count]) => sum + (count - 1), 0)} extra occurrences)`);
    console.log(`   Total extra rows from duplicates: ~${totalDuplicates}\n`);
    
    if (totalDuplicates >= difference) {
      console.log('✅ The extra cases are likely due to duplicate handling in the Excel file.');
      console.log('   Each duplicate gets a suffix (-1, -2, etc.) and is imported as a separate case.\n');
    }
  }

  // Check for cases without callLogNumber or rmaNumber
  const casesWithoutIdentifiers = dbCases.filter(c => !c.callLogNumber && !c.rmaNumber);
  if (casesWithoutIdentifiers.length > 0) {
    console.log(`⚠️  Found ${casesWithoutIdentifiers.length} cases without callLogNumber or rmaNumber\n`);
  }
}

investigate()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
