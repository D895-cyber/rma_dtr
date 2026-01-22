// Remove duplicate RMA cases (with suffixes) while ensuring all 824 Excel entries are preserved
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

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

async function removeDuplicateCases() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Remove Duplicate RMA Cases                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Read Excel file
  const excelData = readExcelFile('rma_cases.xlsx');
  console.log(`📄 Excel file rows: ${excelData.length}\n`);

  if (excelData.length === 0) {
    console.log('❌ No data found in Excel file');
    return;
  }

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

  console.log(`📊 Database cases: ${dbCases.length}\n`);

  // Create a map of Excel rows by their identifiers
  // Use callLogNumber as primary identifier, rmaNumber as secondary
  const excelRowMap = new Map<string, any>();
  
  excelData.forEach((row, index) => {
    const callLog = row.callLogNumber ? String(row.callLogNumber).trim() : null;
    const rmaNum = row.rmaNumber && row.rmaNumber !== '-' && row.rmaNumber !== '"-"' 
      ? String(row.rmaNumber).trim() : null;
    
    // Create a unique key for this Excel row
    const key = callLog || `row_${index}`;
    excelRowMap.set(key, { ...row, excelIndex: index, callLog, rmaNum });
  });

  console.log(`📋 Excel rows mapped: ${excelRowMap.size}\n`);

  // Find cases that match Excel rows (original cases)
  const casesToKeep = new Set<string>();
  const casesToDelete: Array<{ id: string; callLogNumber: string | null; rmaNumber: string | null; reason: string }> = [];

  // First pass: Match Excel rows to database cases
  for (const [excelKey, excelRow] of excelRowMap.entries()) {
    const callLog = excelRow.callLog;
    const rmaNum = excelRow.rmaNum;

    // Find matching case in database - try exact match first
    let matchedCase = dbCases.find(c => {
      const dbCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
      const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
      
      // Exact match by callLogNumber
      if (callLog && dbCallLog === callLog) {
        // If rmaNumber exists in Excel, try to match it too
        if (rmaNum && dbRmaNum) {
          return dbRmaNum === rmaNum;
        }
        // If no rmaNumber in Excel, just match callLogNumber
        return true;
      }
      return false;
    });

    // If no exact match and Excel has a suffix, try matching without suffix
    if (!matchedCase && callLog && callLog.includes('-')) {
      const baseCallLog = callLog.split('-').slice(0, -1).join('-');
      matchedCase = dbCases.find(c => {
        const dbCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
        const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
        
        // Match base callLogNumber
        if (dbCallLog === baseCallLog || dbCallLog === callLog) {
          // If rmaNumber exists in Excel, try to match it too
          if (rmaNum && dbRmaNum) {
            // Try exact match or match base rmaNumber
            const baseRmaNum = rmaNum.includes('-') ? rmaNum.split('-').slice(0, -1).join('-') : rmaNum;
            return dbRmaNum === rmaNum || dbRmaNum === baseRmaNum;
          }
          return true;
        }
        return false;
      });
    }

    // If no match, try by rmaNumber only (if callLogNumber is missing)
    if (!matchedCase && rmaNum) {
      matchedCase = dbCases.find(c => {
        const dbRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
        if (dbRmaNum === rmaNum) {
          return true;
        }
        // Try matching base rmaNumber if Excel has suffix
        if (rmaNum.includes('-')) {
          const baseRmaNum = rmaNum.split('-').slice(0, -1).join('-');
          return dbRmaNum === baseRmaNum;
        }
        return false;
      });
    }

    if (matchedCase) {
      casesToKeep.add(matchedCase.id);
    } else {
      console.log(`⚠️  No match found for Excel row ${excelRow.excelIndex + 1}: CallLog=${callLog || 'N/A'}, RMA=${rmaNum || 'N/A'}`);
    }
  }

  console.log(`✅ Matched ${casesToKeep.size} Excel rows to database cases\n`);

  // Second pass: Identify duplicate cases (with suffixes)
  for (const dbCase of dbCases) {
    // Skip if already marked to keep
    if (casesToKeep.has(dbCase.id)) {
      continue;
    }

    const callLog = dbCase.callLogNumber ? String(dbCase.callLogNumber).trim() : null;
    const rmaNum = dbCase.rmaNumber ? String(dbCase.rmaNumber).trim() : null;

    // Check if this case has a suffix (indicating it's a duplicate)
    let isDuplicate = false;
    let originalCallLog: string | null = null;
    let originalRmaNum: string | null = null;

    if (callLog && callLog.includes('-')) {
      // Extract the base callLogNumber (before suffix)
      const parts = callLog.split('-');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        // Check if last part is a number (suffix added by import)
        if (/^\d+$/.test(lastPart)) {
          originalCallLog = parts.slice(0, -1).join('-');
          isDuplicate = true;
        }
      }
    }

    if (rmaNum && rmaNum.includes('-')) {
      const parts = rmaNum.split('-');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
          originalRmaNum = parts.slice(0, -1).join('-');
          isDuplicate = true;
        }
      }
    }

    // If it's a duplicate, check if the original case exists and is kept
    if (isDuplicate) {
      const originalExists = dbCases.some(c => {
        if (casesToKeep.has(c.id)) {
          const cCallLog = c.callLogNumber ? String(c.callLogNumber).trim() : null;
          const cRmaNum = c.rmaNumber ? String(c.rmaNumber).trim() : null;
          
          if (originalCallLog && cCallLog === originalCallLog) {
            return true;
          }
          if (originalRmaNum && cRmaNum === originalRmaNum) {
            return true;
          }
        }
        return false;
      });

      if (originalExists) {
        casesToDelete.push({
          id: dbCase.id,
          callLogNumber: callLog,
          rmaNumber: rmaNum,
          reason: `Duplicate of ${originalCallLog || originalRmaNum || 'original'}`,
        });
      }
    }
  }

  console.log(`🗑️  Cases to delete: ${casesToDelete.length}\n`);

  if (casesToDelete.length === 0) {
    console.log('✅ No duplicate cases found to delete.\n');
    return;
  }

  // Show sample of cases to delete
  console.log('📋 Sample cases to delete (first 10):');
  casesToDelete.slice(0, 10).forEach((c, i) => {
    console.log(`   ${i + 1}. CallLog: ${c.callLogNumber || 'N/A'}, RMA: ${c.rmaNumber || 'N/A'} - ${c.reason}`);
  });
  if (casesToDelete.length > 10) {
    console.log(`   ... and ${casesToDelete.length - 10} more\n`);
  } else {
    console.log('');
  }

  // Confirm deletion
  console.log('⚠️  About to delete the following:');
  console.log(`   - ${casesToDelete.length} duplicate cases`);
  console.log(`   - ${casesToKeep.size} cases will be kept`);
  console.log(`   - Final count should be: ${casesToKeep.size} cases\n`);

  // Delete the duplicate cases
  const idsToDelete = casesToDelete.map(c => c.id);
  
  console.log('🗑️  Deleting duplicate cases...\n');
  
  // Delete audit logs first
  const auditLogsDeleted = await prisma.auditLog.deleteMany({
    where: {
      caseId: { in: idsToDelete },
      caseType: 'RMA',
    },
  });
  console.log(`   ✅ Deleted ${auditLogsDeleted.count} audit log(s)`);

  // Delete the cases
  const deletedResult = await prisma.rmaCase.deleteMany({
    where: {
      id: { in: idsToDelete },
    },
  });
  console.log(`   ✅ Deleted ${deletedResult.count} RMA case(s)\n`);

  // Verify final count
  const finalCount = await prisma.rmaCase.count();
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`Excel rows: ${excelData.length}`);
  console.log(`Cases before: ${dbCases.length}`);
  console.log(`Cases deleted: ${deletedResult.count}`);
  console.log(`Cases after: ${finalCount}`);
  console.log(`Expected: ${excelData.length}`);
  console.log(`Difference: ${finalCount - excelData.length}\n`);

  if (finalCount === excelData.length) {
    console.log('✅ Perfect! All Excel entries are in the database, duplicates removed.\n');
  } else if (finalCount > excelData.length) {
    console.log(`⚠️  Still ${finalCount - excelData.length} extra cases. Some may not have been identified as duplicates.\n`);
  } else {
    console.log(`⚠️  ${excelData.length - finalCount} cases are missing. Some Excel rows may not have matches.\n`);
  }
}

removeDuplicateCases()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
