// Script to fix AUTO-XXX audis using updated Excel files
// This will also handle site name variations and typos

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

// Helper to normalize serial number
function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

// Helper to normalize site name (for fuzzy matching)
function normalizeSiteName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/Gurjrat/gi, 'Gujarat')
    .replace(/Ghandhinagar/gi, 'Gandhinagar')
    .toLowerCase();
}

async function fixAutoAudis() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           Fixing AUTO-XXX Audis with Excel Data                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Read Excel files
  console.log('📖 Reading Excel files...\n');
  const audisData = readExcelFile('audis.xlsx');
  const projectorsData = readExcelFile('projectors.xlsx');
  const sitesData = readExcelFile('sites.xlsx');

  console.log(`   audis.xlsx: ${audisData.length} rows`);
  console.log(`   projectors.xlsx: ${projectorsData.length} rows`);
  console.log(`   sites.xlsx: ${sitesData.length} rows\n`);

  // Build mapping: serial number -> audi data
  const serialToData = new Map<string, {
    serialNumber: string;
    audiNo: string;
    siteName: string;
    unitModel?: string;
  }>();

  // From audis.xlsx (priority)
  for (const row of audisData) {
    const serial = normalizeSerial(
      row.serialNumber || row.SerialNumber || row.serial_number || 
      row.unitSerial || row.UnitSerial || ''
    );
    const siteName = String(row.siteName || row.SiteName || row.site_name || '').trim();
    const audiNo = String(row.audiNo || row.AudiNo || row.audi_no || row.audiNumber || row.AudiNumber || '').trim();

    if (serial && siteName && audiNo) {
      serialToData.set(serial, {
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
      const existing = serialToData.get(serial);
      if (!existing) {
        serialToData.set(serial, {
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

  console.log(`📊 Mapped ${serialToData.size} serial numbers to audis\n`);

  // Get all AUTO-XXX audis
  console.log('🔍 Finding AUTO-XXX audis...\n');
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
    console.log('✅ No AUTO-XXX audis found!\n');
    return;
  }

  // Get all sites for fuzzy matching
  const allSites = await prisma.site.findMany();
  const siteMap = new Map<string, string>(); // normalized name -> actual site ID
  allSites.forEach(site => {
    const normalized = normalizeSiteName(site.siteName);
    if (!siteMap.has(normalized)) {
      siteMap.set(normalized, site.id);
    }
  });

  let fixed = 0;
  let merged = 0;
  let skipped = 0;
  let errors = 0;

  for (const audi of autoAudis) {
    try {
      if (!audi.projector) {
        console.log(`⏭️  Skipping ${audi.audiNo}: No projector`);
        skipped++;
        continue;
      }

      const serialNumber = normalizeSerial(audi.projector.serialNumber);
      const excelData = serialToData.get(serialNumber);

      if (!excelData) {
        console.log(`⚠️  ${audi.audiNo} (Serial: ${serialNumber}): No Excel data found`);
        skipped++;
        continue;
      }

      // Find site with fuzzy matching
      let correctSite = allSites.find(s => 
        normalizeSiteName(s.siteName) === normalizeSiteName(excelData.siteName)
      );

      if (!correctSite) {
        // Try exact match
        correctSite = allSites.find(s => s.siteName === excelData.siteName);
      }

      // If still not found, try to create it or find similar
      if (!correctSite) {
        // Try to find similar site names (contains check)
        const normalizedExcel = normalizeSiteName(excelData.siteName);
        correctSite = allSites.find(s => {
          const normalized = normalizeSiteName(s.siteName);
          return normalized.includes(normalizedExcel) || normalizedExcel.includes(normalized);
        });
      }

      if (!correctSite) {
        // Create the site if it doesn't exist
        console.log(`📝 Creating new site: "${excelData.siteName}"`);
        correctSite = await prisma.site.create({
          data: {
            siteName: excelData.siteName,
          },
        });
        allSites.push(correctSite); // Add to cache
        console.log(`   ✅ Created site: ${excelData.siteName}`);
      }

      // Check if audi already exists
      const existingAudi = await prisma.audi.findFirst({
        where: {
          siteId: correctSite.id,
          audiNo: excelData.audiNo,
          NOT: { id: audi.id },
        },
      });

      if (existingAudi) {
        console.log(`🔄 ${audi.audiNo}: Merging with existing audi ${excelData.audiNo} at ${excelData.siteName}`);
        
        // Move DTR cases
        const dtrCount = await prisma.dtrCase.count({
          where: { audiId: audi.id },
        });
        if (dtrCount > 0) {
          await prisma.dtrCase.updateMany({
            where: { audiId: audi.id },
            data: { audiId: existingAudi.id },
          });
          console.log(`   ✅ Moved ${dtrCount} DTR case(s)`);
        }

        // Move RMA cases
        const rmaCount = await prisma.rmaCase.count({
          where: { audiId: audi.id },
        });
        if (rmaCount > 0) {
          await prisma.rmaCase.updateMany({
            where: { audiId: audi.id },
            data: { audiId: existingAudi.id },
          });
          console.log(`   ✅ Moved ${rmaCount} RMA case(s)`);
        }

        // Link projector to existing audi
        await prisma.audi.update({
          where: { id: existingAudi.id },
          data: { projectorId: audi.projector.id },
        });

        // Delete AUTO-XXX audi
        await prisma.audi.delete({
          where: { id: audi.id },
        });

        console.log(`   ✅ Merged and deleted ${audi.audiNo}`);
        merged++;
        continue;
      }

      // Update projector model if needed
      if (excelData.unitModel && excelData.unitModel !== 'UNKNOWN') {
        let projectorModel = await prisma.projectorModel.findFirst({
          where: { modelNo: excelData.unitModel },
        });

        if (!projectorModel) {
          projectorModel = await prisma.projectorModel.create({
            data: {
              modelNo: excelData.unitModel,
              manufacturer: 'Unknown',
              specifications: 'Auto-created from Excel',
            },
          });
        }

        await prisma.projector.update({
          where: { id: audi.projector.id },
          data: { projectorModelId: projectorModel.id },
        });
      }

      // Update audi
      await prisma.audi.update({
        where: { id: audi.id },
        data: {
          audiNo: excelData.audiNo,
          siteId: correctSite.id,
        },
      });

      console.log(`✅ ${audi.audiNo} → ${excelData.audiNo} at ${excelData.siteName} (Serial: ${serialNumber})`);
      fixed++;
    } catch (error: any) {
      console.log(`❌ Error fixing ${audi.audiNo}: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`🔄 Merged: ${merged}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${autoAudis.length}\n`);
}

// Run
fixAutoAudis()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

