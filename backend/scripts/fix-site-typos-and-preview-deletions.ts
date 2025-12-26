// Script to:
// 1. Fix site name typos in database
// 2. Preview which cases will be deleted (without deleting)
// 3. Allow user to confirm before deletion

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Helper function to read Excel file
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

// Helper to normalize serial number
function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

// Site name typo corrections
const siteNameCorrections: Record<string, string> = {
  'Gurjrat': 'Gujarat',
  'Ghandhinagar': 'Gandhinagar',
  'Racecourse Vadodara Gurjrat': 'Racecourse Vadodara Gujarat',
  'Suman City Ghandhinagar': 'Suman City Gandhinagar',
  // Full site names with typos
  'Racecourse Vadodara Gujarat': 'Racecourse Vadodara Gujarat', // Already correct, but handle if it was renamed wrong
};

// Function to fix site name typos
async function fixSiteNameTypos() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    Fixing Site Name Typos                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let fixed = 0;

  for (const [typo, correct] of Object.entries(siteNameCorrections)) {
    // Skip if typo and correct are the same
    if (typo === correct) continue;

    // Find sites with exact typo match first
    let sitesWithTypo = await prisma.site.findMany({
      where: {
        siteName: typo,
      },
    });

    // If no exact match, try contains
    if (sitesWithTypo.length === 0) {
      sitesWithTypo = await prisma.site.findMany({
        where: {
          siteName: {
            contains: typo,
            mode: 'insensitive',
          },
        },
      });
    }

    if (sitesWithTypo.length === 0) {
      continue; // No sites with this typo
    }

    // Check if correct site exists
    const correctSite = await prisma.site.findFirst({
      where: { siteName: correct },
    });

    for (const site of sitesWithTypo) {
      // Skip if it's a partial match but the full name doesn't contain the typo
      if (site.siteName.includes(typo) && !site.siteName.includes(correct) && site.siteName !== typo) {
        // This is a partial match, try to fix the full name
        const fixedName = site.siteName.replace(new RegExp(typo, 'gi'), correct);
        if (fixedName !== site.siteName) {
          console.log(`✏️  Renaming site "${site.siteName}" → "${fixedName}"`);
          await prisma.site.update({
            where: { id: site.id },
            data: { siteName: fixedName },
          });
          fixed++;
          continue;
        }
      }

      if (site.siteName === correct) {
        continue; // Already correct
      }

      if (correctSite) {
        // Merge: Move all audis, DTR cases, and RMA cases to correct site
        console.log(`🔄 Merging site "${site.siteName}" → "${correct}"`);
        
        // Update audis
        const audiCount = await prisma.audi.count({
          where: { siteId: site.id },
        });
        if (audiCount > 0) {
          await prisma.audi.updateMany({
            where: { siteId: site.id },
            data: { siteId: correctSite.id },
          });
          console.log(`   ✅ Moved ${audiCount} audi(s)`);
        }

        // Update DTR cases
        const dtrCount = await prisma.dtrCase.count({
          where: { siteId: site.id },
        });
        if (dtrCount > 0) {
          await prisma.dtrCase.updateMany({
            where: { siteId: site.id },
            data: { siteId: correctSite.id },
          });
          console.log(`   ✅ Moved ${dtrCount} DTR case(s)`);
        }

        // Update RMA cases
        const rmaCount = await prisma.rmaCase.count({
          where: { siteId: site.id },
        });
        if (rmaCount > 0) {
          await prisma.rmaCase.updateMany({
            where: { siteId: site.id },
            data: { siteId: correctSite.id },
          });
          console.log(`   ✅ Moved ${rmaCount} RMA case(s)`);
        }

        // Delete the typo site
        await prisma.site.delete({
          where: { id: site.id },
        });
        console.log(`   ✅ Deleted typo site "${site.siteName}"`);
        fixed++;
      } else {
        // Just rename the site
        console.log(`✏️  Renaming site "${site.siteName}" → "${correct}"`);
        await prisma.site.update({
          where: { id: site.id },
          data: { siteName: correct },
        });
        fixed++;
      }
    }
  }

  console.log(`\n✅ Fixed ${fixed} site name typo(s)\n`);
}

// Function to preview deletions (without actually deleting)
async function previewDeletions() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Preview: Cases to be Deleted                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Read Excel files
  const audisData = readExcelFile('audis.xlsx');
  const projectorsData = readExcelFile('projectors.xlsx');

  // Build mapping of valid serial numbers from Excel
  const serialToAudiData = new Map<string, any>();
  
  for (const row of audisData) {
    const serial = normalizeSerial(
      row.serialNumber || row.SerialNumber || row.serial_number || 
      row.unitSerial || row.UnitSerial || ''
    );
    if (serial) {
      serialToAudiData.set(serial, true);
    }
  }

  for (const row of projectorsData) {
    const serial = normalizeSerial(
      row.serialNumber || row.SerialNumber || row.serial_number || ''
    );
    if (serial) {
      serialToAudiData.set(serial, true);
    }
  }

  // Get all valid projectors with audis
  const validProjectors = await prisma.projector.findMany({
    where: {
      audis: {
        some: {},
      },
    },
  });

  const validSerialNumbers = new Set<string>();
  validProjectors.forEach(p => {
    if (p.serialNumber) {
      validSerialNumbers.add(normalizeSerial(p.serialNumber));
    }
  });

  // Get all projectors in database
  const allProjectors = await prisma.projector.findMany({
    select: { serialNumber: true },
  });
  const allProjectorSerials = new Set<string>();
  allProjectors.forEach(p => {
    if (p.serialNumber) {
      allProjectorSerials.add(normalizeSerial(p.serialNumber));
    }
  });

  // Preview DTR cases to delete
  console.log('📋 DTR Cases to be Deleted:\n');
  const allDTRCases = await prisma.dtrCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
          site: true,
        },
      },
      site: true,
    },
    orderBy: { caseNumber: 'asc' },
  });

  const dtrToDelete: any[] = [];
  for (const dtrCase of allDTRCases) {
    const serialNumber = normalizeSerial(dtrCase.unitSerial);
    
    if (!serialNumber) {
      continue;
    }

    const hasValidAudi = dtrCase.audi && dtrCase.audi.projector && 
                         normalizeSerial(dtrCase.audi.projector.serialNumber) === serialNumber;
    const existsInValidProjectors = validSerialNumbers.has(serialNumber);
    const existsInExcel = serialToAudiData.has(serialNumber);
    const projectorExists = allProjectorSerials.has(serialNumber);

    if (!hasValidAudi && !existsInValidProjectors && !existsInExcel && !projectorExists) {
      dtrToDelete.push({
        caseNumber: dtrCase.caseNumber,
        serialNumber: serialNumber,
        site: dtrCase.site?.siteName || 'Unknown',
        errorDate: dtrCase.errorDate,
        natureOfProblem: dtrCase.natureOfProblem?.substring(0, 50) || '',
      });
    }
  }

  if (dtrToDelete.length === 0) {
    console.log('   ✅ No DTR cases to delete\n');
  } else {
    console.log(`   ⚠️  Found ${dtrToDelete.length} DTR case(s) to delete:\n`);
    dtrToDelete.forEach((dtr, index) => {
      console.log(`   ${index + 1}. Case #${dtr.caseNumber}`);
      console.log(`      Serial: ${dtr.serialNumber}`);
      console.log(`      Site: ${dtr.site}`);
      console.log(`      Date: ${dtr.errorDate}`);
      console.log(`      Problem: ${dtr.natureOfProblem}...`);
      console.log('');
    });
  }

  // Preview RMA cases to delete
  console.log('📋 RMA Cases to be Deleted:\n');
  const allRMACases = await prisma.rmaCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
          site: true,
        },
      },
      site: true,
    },
    orderBy: { rmaRaisedDate: 'desc' },
  });

  const rmaToDelete: any[] = [];
  for (const rmaCase of allRMACases) {
    const serialNumber = normalizeSerial(rmaCase.serialNumber);
    
    if (!serialNumber) {
      continue;
    }

    const hasValidAudi = rmaCase.audi && rmaCase.audi.projector && 
                         normalizeSerial(rmaCase.audi.projector.serialNumber) === serialNumber;
    const existsInValidProjectors = validSerialNumbers.has(serialNumber);
    const existsInExcel = serialToAudiData.has(serialNumber);
    const projectorExists = allProjectorSerials.has(serialNumber);

    if (!hasValidAudi && !existsInValidProjectors && !existsInExcel && !projectorExists) {
      rmaToDelete.push({
        rmaNumber: rmaCase.rmaNumber || rmaCase.id.substring(0, 8),
        serialNumber: serialNumber,
        site: rmaCase.site?.siteName || 'Unknown',
        rmaRaisedDate: rmaCase.rmaRaisedDate,
        productName: rmaCase.productName?.substring(0, 40) || '',
      });
    }
  }

  if (rmaToDelete.length === 0) {
    console.log('   ✅ No RMA cases to delete\n');
  } else {
    console.log(`   ⚠️  Found ${rmaToDelete.length} RMA case(s) to delete:\n`);
    rmaToDelete.forEach((rma, index) => {
      console.log(`   ${index + 1}. RMA #${rma.rmaNumber}`);
      console.log(`      Serial: ${rma.serialNumber}`);
      console.log(`      Site: ${rma.site}`);
      console.log(`      Date: ${rma.rmaRaisedDate}`);
      console.log(`      Product: ${rma.productName}...`);
      console.log('');
    });
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Preview Summary                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`🗑️  DTR Cases to Delete: ${dtrToDelete.length}`);
  console.log(`🗑️  RMA Cases to Delete: ${rmaToDelete.length}`);
  console.log(`\n⚠️  These cases have serial numbers that:`);
  console.log(`   - Don't have a valid audi linked`);
  console.log(`   - Don't exist in projectors with audis`);
  console.log(`   - Don't exist in Excel files`);
  console.log(`   - Don't have a projector in database\n`);

  return { dtrToDelete, rmaToDelete };
}

// Function to actually delete the cases
async function deleteCases(dtrToDelete: any[], rmaToDelete: any[]) {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    Deleting Orphaned Cases                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let deletedDTR = 0;
  let deletedRMA = 0;

  // Delete DTR cases
  for (const dtr of dtrToDelete) {
    const dtrCase = await prisma.dtrCase.findFirst({
      where: { caseNumber: dtr.caseNumber },
    });

    if (dtrCase) {
      // Delete audit logs
      await prisma.auditLog.deleteMany({
        where: {
          caseId: dtrCase.id,
          caseType: 'DTR',
        },
      });

      // Delete the case
      await prisma.dtrCase.delete({
        where: { id: dtrCase.id },
      });

      console.log(`✅ Deleted DTR case ${dtr.caseNumber}`);
      deletedDTR++;
    }
  }

  // Delete RMA cases
  for (const rma of rmaToDelete) {
    const rmaCase = await prisma.rmaCase.findFirst({
      where: {
        OR: [
          { rmaNumber: rma.rmaNumber },
          { id: { startsWith: rma.rmaNumber } },
        ],
      },
    });

    if (rmaCase) {
      // Delete audit logs
      await prisma.auditLog.deleteMany({
        where: {
          caseId: rmaCase.id,
          caseType: 'RMA',
        },
      });

      // Delete the case
      await prisma.rmaCase.delete({
        where: { id: rmaCase.id },
      });

      console.log(`✅ Deleted RMA case ${rma.rmaNumber}`);
      deletedRMA++;
    }
  }

  console.log(`\n✅ Deleted ${deletedDTR} DTR case(s)`);
  console.log(`✅ Deleted ${deletedRMA} RMA case(s)\n`);
}

// Main function
async function main() {
  // Step 1: Fix site name typos
  await fixSiteNameTypos();

  // Step 2: Preview deletions
  const { dtrToDelete, rmaToDelete } = await previewDeletions();

  if (dtrToDelete.length === 0 && rmaToDelete.length === 0) {
    console.log('✅ No cases to delete. All done!\n');
    return;
  }

  // Step 3: Ask for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`\n⚠️  Do you want to delete ${dtrToDelete.length} DTR case(s) and ${rmaToDelete.length} RMA case(s)? (yes/no): `, resolve);
  });

  rl.close();

  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    await deleteCases(dtrToDelete, rmaToDelete);
    console.log('✅ Cleanup completed!\n');
  } else {
    console.log('\n❌ Deletion cancelled by user.\n');
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

