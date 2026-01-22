// Check for duplicates in Excel that might cause multiple rows to match same DB case
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

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

async function checkDuplicates() {
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

  // Count how many Excel rows match each database case
  const dbCaseMatchCount = new Map<string, number>();
  
  for (const row of excelData) {
    const callLog = row.callLogNumber ? String(row.callLogNumber).trim() : null;
    const rmaNum = row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"' 
      ? String(row.rmaNumber).trim() : null;

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

    if (matched) {
      dbCaseMatchCount.set(matched.id, (dbCaseMatchCount.get(matched.id) || 0) + 1);
    }
  }

  // Find cases matched by multiple Excel rows
  const multiMatched = Array.from(dbCaseMatchCount.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`Database cases matched by multiple Excel rows: ${multiMatched.length}\n`);

  if (multiMatched.length > 0) {
    console.log('Cases with multiple matches:');
    multiMatched.slice(0, 20).forEach(([caseId, count]) => {
      const dbCase = dbCases.find(c => c.id === caseId);
      console.log(`  CallLog: ${dbCase?.callLogNumber || 'N/A'}, RMA: ${dbCase?.rmaNumber || 'N/A'} - matched by ${count} Excel rows`);
    });
    if (multiMatched.length > 20) {
      console.log(`  ... and ${multiMatched.length - 20} more`);
    }
    console.log('');

    const totalExtraMatches = multiMatched.reduce((sum, [_, count]) => sum + (count - 1), 0);
    console.log(`Total extra matches: ${totalExtraMatches}`);
    console.log(`This explains why we have ${excelData.length} Excel rows but only ${dbCases.length} database cases.\n`);
  }

  // Check for duplicate callLogNumbers in Excel
  const callLogCounts = new Map<string, number>();
  excelData.forEach((row: any) => {
    const cl = row.callLogNumber ? String(row.callLogNumber).trim() : null;
    if (cl) {
      callLogCounts.set(cl, (callLogCounts.get(cl) || 0) + 1);
    }
  });

  const dupCallLogs = Array.from(callLogCounts.entries()).filter(([_, c]) => c > 1);
  
  if (dupCallLogs.length > 0) {
    console.log(`\nDuplicate callLogNumbers in Excel: ${dupCallLogs.length}`);
    console.log('These cause multiple Excel rows to match the same database case.\n');
  }
}

checkDuplicates()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
