// Script to fix AUTO-XXX audis by updating them with correct data from Excel files
// This script:
// 1. Reads DTR cases Excel to get correct audi numbers, site names, and models
// 2. Finds all AUTO-XXX audis
// 3. Matches them by projector serial number
// 4. Updates audi numbers, sites, and projector models

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

// Verify Excel file structure
function verifyExcelStructure() {
  console.log('\n📋 Verifying Excel File Structure...\n');
  
  const files = [
    { name: 'dtr_cases.xlsx', requiredColumns: ['serialNumber', 'siteName', 'audiNo', 'unitModel'] },
    { name: 'audis.xlsx', requiredColumns: ['audiNo', 'siteName', 'serialNumber'] },
    { name: 'sites.xlsx', requiredColumns: ['siteName'] },
  ];

  for (const file of files) {
    const data = readExcelFile(file.name);
    
    if (data.length === 0) {
      console.log(`⚠️  ${file.name}: File is empty or not found`);
      continue;
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const missingColumns = file.requiredColumns.filter(col => !columns.includes(col));
    
    console.log(`📄 ${file.name}:`);
    console.log(`   Total rows: ${data.length}`);
    console.log(`   Columns found: ${columns.join(', ')}`);
    
    if (missingColumns.length > 0) {
      console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log(`   ✅ All required columns present`);
    }
    
    // Show sample data
    if (data.length > 0) {
      console.log(`   Sample row:`);
      file.requiredColumns.forEach(col => {
        const value = firstRow[col];
        console.log(`      ${col}: ${value || '(empty)'}`);
      });
    }
    console.log('');
  }
}

// Main function to fix AUTO-XXX audis
async function fixAutoAudis() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           Fixing AUTO-XXX Audis with Original Data              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Verify Excel structure
  verifyExcelStructure();

  // Step 2: Read DTR cases to get correct data
  console.log('📖 Reading DTR cases data...');
  const dtrData = readExcelFile('dtr_cases.xlsx');
  console.log(`   Found ${dtrData.length} DTR cases\n`);

  // Step 3: Read audis Excel (if available)
  console.log('📖 Reading audis data...');
  const audisData = readExcelFile('audis.xlsx');
  console.log(`   Found ${audisData.length} audis\n`);

  // Step 4: Create a map of serial number -> correct data
  const serialToData = new Map<string, {
    audiNo: string;
    siteName: string;
    unitModel: string;
  }>();

  // From audis Excel FIRST (has priority) - try multiple column name variations
  for (const row of audisData) {
    const serial = String(
      row.serialNumber || row.SerialNumber || row.serial_number || ''
    ).trim();
    
    const siteName = String(
      row.siteName || row.SiteName || row.site_name || ''
    ).trim();
    
    const audiNo = String(
      row.audiNo || row.AudiNo || row.audi_no || row.audiNumber || row.AudiNumber || ''
    ).trim();
    
    if (serial && siteName && audiNo) {
      serialToData.set(serial, {
        audiNo: audiNo,
        siteName: siteName,
        unitModel: '', // Not in audis file
      });
    }
  }

  // From DTR cases - only add if not already in map (audis takes priority)
  // Also, DTR might not have siteName/audiNo, so we only use it for unitModel
  for (const row of dtrData) {
    const serial = String(
      row.serialNumber || row.unitSerial || row.SerialNumber || 
      row.UnitSerial || row.serial_number || row.unit_serial || ''
    ).trim();
    
    if (!serial) continue;
    
    const existing = serialToData.get(serial);
    const unitModel = String(
      row.unitModel || row.UnitModel || row.unit_model || ''
    ).trim();
    
    // If we already have data from audis, just add unitModel
    if (existing && unitModel) {
      existing.unitModel = unitModel;
    } 
    // If we don't have data yet, try to get from DTR (but DTR might not have site/audi)
    else if (!existing) {
      const siteName = String(
        row.siteName || row.SiteName || row.site_name || ''
      ).trim();
      
      const audiNo = String(
        row.audiNo || row.AudiNo || row.audi_no || row.audiNumber || row.AudiNumber || ''
      ).trim();
      
      // Only add if we have siteName and audiNo
      if (siteName && audiNo) {
        serialToData.set(serial, {
          audiNo: audiNo,
          siteName: siteName,
          unitModel: unitModel,
        });
      }
    }
  }

  console.log(`📊 Created mapping for ${serialToData.size} projectors\n`);

  // Step 5: Find all AUTO-XXX audis
  console.log('🔍 Finding AUTO-XXX audis...');
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

  if (autoAudis.length === 0) {
    console.log('✅ No AUTO-XXX audis found. Nothing to fix!\n');
    return;
  }

  // Step 6: Update each AUTO-XXX audi
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const audi of autoAudis) {
    try {
      if (!audi.projector) {
        console.log(`⏭️  Skipping ${audi.audiNo}: No projector assigned`);
        skipped++;
        continue;
      }

      const serialNumber = audi.projector.serialNumber;
      const correctData = serialToData.get(serialNumber);

      if (!correctData) {
        console.log(`⚠️  No data found for ${audi.audiNo} (Serial: ${serialNumber})`);
        skipped++;
        continue;
      }

      // Find the correct site
      const correctSite = await prisma.site.findFirst({
        where: { siteName: correctData.siteName },
      });

      if (!correctSite) {
        console.log(`❌ Site "${correctData.siteName}" not found for ${audi.audiNo}`);
        errors++;
        continue;
      }

      // Check if audi with this number already exists at this site
      const existingAudi = await prisma.audi.findFirst({
        where: {
          siteId: correctSite.id,
          audiNo: correctData.audiNo,
          NOT: { id: audi.id },
        },
      });

      if (existingAudi) {
        console.log(`⚠️  Audi "${correctData.audiNo}" already exists at "${correctData.siteName}". Linking projector to existing audi...`);
        
        // First, update all DTR cases linked to AUTO-XXX audi to point to existing audi
        const dtrCasesCount = await prisma.dtrCase.count({
          where: { audiId: audi.id },
        });
        
        if (dtrCasesCount > 0) {
          await prisma.dtrCase.updateMany({
            where: { audiId: audi.id },
            data: { audiId: existingAudi.id },
          });
          console.log(`   ℹ️  Updated ${dtrCasesCount} DTR case(s) to point to existing audi`);
        }

        // Update RMA cases if any
        const rmaCasesCount = await prisma.rmaCase.count({
          where: { audiId: audi.id },
        });
        
        if (rmaCasesCount > 0) {
          await prisma.rmaCase.updateMany({
            where: { audiId: audi.id },
            data: { audiId: existingAudi.id },
          });
          console.log(`   ℹ️  Updated ${rmaCasesCount} RMA case(s) to point to existing audi`);
        }
        
        // Link projector to existing audi
        await prisma.audi.update({
          where: { id: existingAudi.id },
          data: { projectorId: audi.projector.id },
        });

        // Now safe to delete the AUTO-XXX audi
        await prisma.audi.delete({
          where: { id: audi.id },
        });

        console.log(`   ✅ Linked projector ${serialNumber} to existing audi ${correctData.audiNo} and deleted AUTO-XXX audi`);
        updated++;
        continue;
      }

      // Update projector model if unitModel is provided
      if (correctData.unitModel && correctData.unitModel !== 'UNKNOWN') {
        let projectorModel = await prisma.projectorModel.findFirst({
          where: { modelNo: correctData.unitModel },
        });

        if (!projectorModel) {
          projectorModel = await prisma.projectorModel.create({
            data: {
              modelNo: correctData.unitModel,
              manufacturer: 'Unknown',
              specifications: 'Auto-created from DTR data',
            },
          });
          console.log(`   ℹ️  Created projector model: ${correctData.unitModel}`);
        }

        // Update projector with correct model
        await prisma.projector.update({
          where: { id: audi.projector.id },
          data: { projectorModelId: projectorModel.id },
        });
      }

      // Update audi with correct data
      await prisma.audi.update({
        where: { id: audi.id },
        data: {
          audiNo: correctData.audiNo,
          siteId: correctSite.id,
        },
      });

      console.log(`✅ Updated ${audi.audiNo} → ${correctData.audiNo} at ${correctData.siteName} (Serial: ${serialNumber})`);
      updated++;
    } catch (error: any) {
      console.log(`❌ Error updating ${audi.audiNo}: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${autoAudis.length}\n`);
}

// Run the script
fixAutoAudis()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

