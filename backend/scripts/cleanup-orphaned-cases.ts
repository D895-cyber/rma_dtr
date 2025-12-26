// Script to:
// 1. Check and fix AUTO-XXX audis with updated Excel data
// 2. Delete DTR/RMA cases with serial numbers that don't have corresponding audis

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

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

// Helper to normalize serial number (remove spaces, uppercase)
function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

async function cleanupOrphanedCases() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        Cleanup Orphaned Cases & Fix AUTO-XXX Audis               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Read updated Excel files
  console.log('📖 Reading updated Excel files...\n');
  
  const sitesData = readExcelFile('sites.xlsx');
  const audisData = readExcelFile('audis.xlsx');
  const projectorsData = readExcelFile('projectors.xlsx');
  const dtrData = readExcelFile('dtr_cases.xlsx');
  const rmaData = readExcelFile('rma_cases.xlsx');

  console.log(`   sites.xlsx: ${sitesData.length} rows`);
  console.log(`   audis.xlsx: ${audisData.length} rows`);
  console.log(`   projectors.xlsx: ${projectorsData.length} rows`);
  console.log(`   dtr_cases.xlsx: ${dtrData.length} rows`);
  console.log(`   rma_cases.xlsx: ${rmaData.length} rows\n`);

  // Step 2: Build mapping of serial number -> audi data from Excel
  console.log('📊 Building serial number to audi mapping from Excel...');
  const serialToAudiData = new Map<string, {
    serialNumber: string;
    audiNo: string;
    siteName: string;
    unitModel?: string;
  }>();

  // From audis.xlsx (highest priority)
  for (const row of audisData) {
    const serial = normalizeSerial(
      row.serialNumber || row.SerialNumber || row.serial_number || 
      row.unitSerial || row.UnitSerial || ''
    );
    const siteName = String(row.siteName || row.SiteName || row.site_name || '').trim();
    const audiNo = String(row.audiNo || row.AudiNo || row.audi_no || row.audiNumber || row.AudiNumber || '').trim();

    if (serial && siteName && audiNo) {
      serialToAudiData.set(serial, {
        serialNumber: serial,
        audiNo: audiNo,
        siteName: siteName,
      });
    }
  }

  // From projectors.xlsx
  for (const row of projectorsData) {
    const serial = normalizeSerial(
      row.serialNumber || row.SerialNumber || row.serial_number || ''
    );
    const siteName = String(row.siteName || row.SiteName || row.site_name || '').trim();
    const audiNo = String(row.audiNo || row.AudiNo || row.audi_no || row.audiNumber || row.AudiNumber || '').trim();
    const unitModel = String(row.modelNo || row.ModelNo || row.model_no || row.unitModel || row.UnitModel || '').trim();

    if (serial && siteName && audiNo) {
      const existing = serialToAudiData.get(serial);
      if (!existing) {
        serialToAudiData.set(serial, {
          serialNumber: serial,
          audiNo: audiNo,
          siteName: siteName,
          unitModel: unitModel || undefined,
        });
      } else if (unitModel && !existing.unitModel) {
        existing.unitModel = unitModel;
      }
    }
  }

  // From DTR cases (add unitModel if missing)
  for (const row of dtrData) {
    const serial = normalizeSerial(
      row.serialNumber || row.unitSerial || row.SerialNumber || 
      row.UnitSerial || row.serial_number || row.unit_serial || ''
    );
    const unitModel = String(row.unitModel || row.UnitModel || row.unit_model || '').trim();

    if (serial && unitModel) {
      const existing = serialToAudiData.get(serial);
      if (existing && !existing.unitModel) {
        existing.unitModel = unitModel;
      }
    }
  }

  console.log(`   ✅ Mapped ${serialToAudiData.size} serial numbers to audis\n`);

  // Step 3: Get all valid serial numbers from database (projectors that have audis)
  console.log('🔍 Finding all valid projectors with audis in database...');
  const validProjectors = await prisma.projector.findMany({
    where: {
      audis: {
        some: {},
      },
    },
    include: {
      audis: {
        include: {
          site: true,
        },
      },
    },
  });

  const validSerialNumbers = new Set<string>();
  validProjectors.forEach(p => {
    if (p.serialNumber && p.audis.length > 0) {
      validSerialNumbers.add(normalizeSerial(p.serialNumber));
    }
  });

  console.log(`   ✅ Found ${validSerialNumbers.size} valid projectors with audis\n`);

  // Step 4: Fix AUTO-XXX audis with updated Excel data
  console.log('🔧 Fixing AUTO-XXX audis with updated Excel data...\n');
  
  const autoAudis = await prisma.audi.findMany({
    where: {
      audiNo: {
        startsWith: 'AUTO-',
      },
    },
    include: {
      projector: {
        include: {
          projectorModel: true,
        },
      },
      site: true,
    },
  });

  console.log(`   Found ${autoAudis.length} AUTO-XXX audis\n`);

  let fixedAudis = 0;
  let deletedAudis = 0;

  for (const audi of autoAudis) {
    try {
      if (!audi.projector) {
        console.log(`⏭️  Skipping ${audi.audiNo}: No projector assigned`);
        continue;
      }

      const serialNumber = normalizeSerial(audi.projector.serialNumber);
      const excelData = serialToAudiData.get(serialNumber);

      if (!excelData) {
        console.log(`⚠️  No Excel data found for ${audi.audiNo} (Serial: ${serialNumber})`);
        continue;
      }

      // Find the correct site
      const correctSite = await prisma.site.findFirst({
        where: { siteName: excelData.siteName },
      });

      if (!correctSite) {
        console.log(`❌ Site "${excelData.siteName}" not found for ${audi.audiNo}`);
        continue;
      }

      // Check if audi with this number already exists at this site
      const existingAudi = await prisma.audi.findFirst({
        where: {
          siteId: correctSite.id,
          audiNo: excelData.audiNo,
          NOT: { id: audi.id },
        },
      });

      if (existingAudi) {
        console.log(`⚠️  Audi "${excelData.audiNo}" already exists at "${excelData.siteName}". Linking projector to existing audi...`);
        
        // Update all DTR cases linked to AUTO-XXX audi
        const dtrCount = await prisma.dtrCase.count({
          where: { audiId: audi.id },
        });
        
        if (dtrCount > 0) {
          await prisma.dtrCase.updateMany({
            where: { audiId: audi.id },
            data: { audiId: existingAudi.id },
          });
          console.log(`   ℹ️  Updated ${dtrCount} DTR case(s)`);
        }

        // Update RMA cases
        const rmaCount = await prisma.rmaCase.count({
          where: { audiId: audi.id },
        });
        
        if (rmaCount > 0) {
          await prisma.rmaCase.updateMany({
            where: { audiId: audi.id },
            data: { audiId: existingAudi.id },
          });
          console.log(`   ℹ️  Updated ${rmaCount} RMA case(s)`);
        }
        
        // Link projector to existing audi (update audi's projectorId)
        await prisma.audi.update({
          where: { id: existingAudi.id },
          data: { projectorId: audi.projector.id },
        });

        // Delete the AUTO-XXX audi
        await prisma.audi.delete({
          where: { id: audi.id },
        });

        console.log(`   ✅ Linked projector ${serialNumber} to existing audi ${excelData.audiNo}`);
        deletedAudis++;
        continue;
      }

      // Update projector model if unitModel is provided
      if (excelData.unitModel && excelData.unitModel !== 'UNKNOWN') {
        let projectorModel = await prisma.projectorModel.findFirst({
          where: { modelNo: excelData.unitModel },
        });

        if (!projectorModel) {
          projectorModel = await prisma.projectorModel.create({
            data: {
              modelNo: excelData.unitModel,
              manufacturer: 'Unknown',
              specifications: 'Auto-created from Excel data',
            },
          });
        }

        await prisma.projector.update({
          where: { id: audi.projector.id },
          data: { projectorModelId: projectorModel.id },
        });
      }

      // Update audi with correct data
      await prisma.audi.update({
        where: { id: audi.id },
        data: {
          audiNo: excelData.audiNo,
          siteId: correctSite.id,
        },
      });

      console.log(`✅ Fixed ${audi.audiNo} → ${excelData.audiNo} at ${excelData.siteName}`);
      fixedAudis++;
    } catch (error: any) {
      console.log(`❌ Error fixing ${audi.audiNo}: ${error.message}`);
    }
  }

  console.log(`\n   ✅ Fixed: ${fixedAudis}`);
  console.log(`   🗑️  Deleted (merged): ${deletedAudis}\n`);

  // Step 5: Find and delete orphaned DTR cases (serial numbers without audis)
  console.log('🔍 Finding orphaned DTR cases (serial numbers without audis)...\n');
  
  const allDTRCases = await prisma.dtrCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
        },
      },
    },
  });

  let orphanedDTR = 0;
  let deletedDTR = 0;

  for (const dtrCase of allDTRCases) {
    const serialNumber = normalizeSerial(dtrCase.unitSerial);
    
    if (!serialNumber) {
      console.log(`⚠️  DTR Case ${dtrCase.caseNumber} has no serial number - skipping`);
      continue;
    }

    // Check if serial number has a valid audi with matching projector
    const hasValidAudi = dtrCase.audi && dtrCase.audi.projector && 
                         normalizeSerial(dtrCase.audi.projector.serialNumber) === serialNumber;
    
    // Check if serial number exists in valid projectors (any projector with an audi)
    const existsInValidProjectors = validSerialNumbers.has(serialNumber);
    
    // Check if serial number exists in Excel data
    const existsInExcel = serialToAudiData.has(serialNumber);

    // Also check if projector exists at all in database
    const projectorExists = await prisma.projector.findFirst({
      where: { serialNumber: serialNumber },
    });

    // Delete if: serial number doesn't match the audi's projector AND not in valid projectors AND not in Excel AND projector doesn't exist
    if (!hasValidAudi && !existsInValidProjectors && !existsInExcel && !projectorExists) {
      console.log(`🗑️  Deleting orphaned DTR case ${dtrCase.caseNumber} (Serial: ${serialNumber}) - No audi, no projector, not in Excel`);
      
      // Delete audit logs first
      await prisma.auditLog.deleteMany({
        where: {
          caseId: dtrCase.id,
          caseType: 'DTR',
        },
      });

      // Delete the DTR case
      await prisma.dtrCase.delete({
        where: { id: dtrCase.id },
      });

      deletedDTR++;
    } else if (!hasValidAudi) {
      orphanedDTR++;
    }
  }

  console.log(`\n   ⚠️  Orphaned (but kept): ${orphanedDTR}`);
  console.log(`   🗑️  Deleted: ${deletedDTR}\n`);

  // Step 6: Find and delete orphaned RMA cases (serial numbers without audis)
  console.log('🔍 Finding orphaned RMA cases (serial numbers without audis)...\n');
  
  const allRMACases = await prisma.rmaCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
        },
      },
    },
  });

  let orphanedRMA = 0;
  let deletedRMA = 0;

  for (const rmaCase of allRMACases) {
    const serialNumber = normalizeSerial(rmaCase.serialNumber);
    
    if (!serialNumber) {
      console.log(`⚠️  RMA Case ${rmaCase.rmaNumber || rmaCase.id} has no serial number - skipping`);
      continue;
    }

    // Check if serial number has a valid audi with matching projector
    const hasValidAudi = rmaCase.audi && rmaCase.audi.projector && 
                         normalizeSerial(rmaCase.audi.projector.serialNumber) === serialNumber;
    
    // Check if serial number exists in valid projectors (any projector with an audi)
    const existsInValidProjectors = validSerialNumbers.has(serialNumber);
    
    // Check if serial number exists in Excel data
    const existsInExcel = serialToAudiData.has(serialNumber);

    // Also check if projector exists at all in database
    const projectorExists = await prisma.projector.findFirst({
      where: { serialNumber: serialNumber },
    });

    // Delete if: serial number doesn't match the audi's projector AND not in valid projectors AND not in Excel AND projector doesn't exist
    if (!hasValidAudi && !existsInValidProjectors && !existsInExcel && !projectorExists) {
      console.log(`🗑️  Deleting orphaned RMA case ${rmaCase.rmaNumber || rmaCase.id} (Serial: ${serialNumber}) - No audi, no projector, not in Excel`);
      
      // Delete audit logs first
      await prisma.auditLog.deleteMany({
        where: {
          caseId: rmaCase.id,
          caseType: 'RMA',
        },
      });

      // Delete the RMA case
      await prisma.rmaCase.delete({
        where: { id: rmaCase.id },
      });

      deletedRMA++;
    } else if (!hasValidAudi) {
      orphanedRMA++;
    }
  }

  console.log(`\n   ⚠️  Orphaned (but kept): ${orphanedRMA}`);
  console.log(`   🗑️  Deleted: ${deletedRMA}\n`);

  // Final Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Final Summary                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ AUTO-XXX Audis Fixed: ${fixedAudis}`);
  console.log(`🗑️  AUTO-XXX Audis Deleted (merged): ${deletedAudis}`);
  console.log(`🗑️  Orphaned DTR Cases Deleted: ${deletedDTR}`);
  console.log(`🗑️  Orphaned RMA Cases Deleted: ${deletedRMA}`);
  console.log(`\n✅ Cleanup completed!\n`);
}

// Run the script
cleanupOrphanedCases()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

