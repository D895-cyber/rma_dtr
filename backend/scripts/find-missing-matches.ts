// Find which Excel rows don't have database matches
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

async function findMissingMatches() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Find Missing Excel Row Matches                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const excelData = readExcelFile('rma_cases.xlsx');
  const dbCases = await prisma.rmaCase.findMany({
    select: {
      id: true,
      callLogNumber: true,
      rmaNumber: true,
      serialNumber: true,
      createdAt: true,
    },
  });

  console.log(`Excel rows: ${excelData.length}`);
  console.log(`Database cases: ${dbCases.length}\n`);

  const missingMatches: Array<{ row: any; index: number; reason: string }> = [];

  for (let i = 0; i < excelData.length; i++) {
    const row = excelData[i];
    const callLog = row.callLogNumber ? String(row.callLogNumber).trim() : null;
    const rmaNum = row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"' 
      ? String(row.rmaNumber).trim() : null;
    const serial = row.serialNumber ? String(row.serialNumber).trim() : null;

    // Try to find match
    let matched = dbCases.find(c => {
      const dbCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
      const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
      
      // Exact match
      if (callLog && dbCallLog === callLog) {
        if (rmaNum && dbRmaNum) {
          return dbRmaNum === rmaNum;
        }
        return true;
      }
      
      // Match by rmaNumber
      if (rmaNum && dbRmaNum === rmaNum) {
        return true;
      }
      
      return false;
    });

    if (!matched) {
      // Check if there's a similar case (with/without suffix)
      const similarCases = dbCases.filter(c => {
        const dbCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
        const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
        
        if (callLog && dbCallLog) {
          // Check if one has suffix and other doesn't
          if (callLog.includes('-') && !dbCallLog.includes('-')) {
            const baseCallLog = callLog.split('-').slice(0, -1).join('-');
            return dbCallLog === baseCallLog;
          }
          if (!callLog.includes('-') && dbCallLog.includes('-')) {
            const baseDbCallLog = dbCallLog.split('-').slice(0, -1).join('-');
            return callLog === baseDbCallLog;
          }
        }
        
        if (rmaNum && dbRmaNum) {
          if (rmaNum.includes('-') && !dbRmaNum.includes('-')) {
            const baseRmaNum = rmaNum.split('-').slice(0, -1).join('-');
            return dbRmaNum === baseRmaNum;
          }
          if (!rmaNum.includes('-') && dbRmaNum.includes('-')) {
            const baseDbRmaNum = dbRmaNum.split('-').slice(0, -1).join('-');
            return rmaNum === baseDbRmaNum;
          }
        }
        
        return false;
      });

      if (similarCases.length > 0) {
        missingMatches.push({
          row,
          index: i + 1,
          reason: `Similar case exists but not exact match. Excel: CallLog=${callLog || 'N/A'}, RMA=${rmaNum || 'N/A'}. DB: CallLog=${similarCases[0].callLogNumber || 'N/A'}, RMA=${similarCases[0].rmaNumber || 'N/A'}`,
        });
      } else {
        missingMatches.push({
          row,
          index: i + 1,
          reason: `No match found. CallLog=${callLog || 'N/A'}, RMA=${rmaNum || 'N/A'}, Serial=${serial || 'N/A'}`,
        });
      }
    }
  }

  console.log(`Missing matches: ${missingMatches.length}\n`);

  if (missingMatches.length > 0) {
    console.log('First 20 missing matches:');
    missingMatches.slice(0, 20).forEach((m, i) => {
      console.log(`\n${i + 1}. Row ${m.index}:`);
      console.log(`   ${m.reason}`);
    });
    if (missingMatches.length > 20) {
      console.log(`\n... and ${missingMatches.length - 20} more`);
    }
  } else {
    console.log('✅ All Excel rows have matches!');
  }
}

findMissingMatches()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
