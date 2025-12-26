// Create missing audis from Excel data and link orphaned cases
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
    .replace(/\s+/g, ' ')
    .replace(/Gurjrat/gi, 'Gujarat')
    .replace(/Ghandhinagar/gi, 'Gandhinagar')
    .toLowerCase();
}

async function createMissingAudis() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        Creating Missing Audis from Excel Data                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Read Excel files
  console.log('📖 Reading Excel files...\n');
  const audisData = readExcelFile('audis.xlsx');
  console.log(`   audis.xlsx: ${audisData.length} rows\n`);

  // Get all sites for matching
  const allSites = await prisma.site.findMany();
  const siteMap = new Map<string, string>(); // normalized name -> site ID
  allSites.forEach(site => {
    const normalized = normalizeSiteName(site.siteName);
    if (!siteMap.has(normalized)) {
      siteMap.set(normalized, site.id);
    }
  });

  // Get all existing audis
  const existingAudis = await prisma.audi.findMany({
    include: {
      projector: true,
    },
  });

  const existingAudiMap = new Map<string, string>(); // serial -> audi ID
  existingAudis.forEach(audi => {
    if (audi.projector) {
      const serial = normalizeSerial(audi.projector.serialNumber);
      if (serial) {
        existingAudiMap.set(serial, audi.id);
      }
    }
  });

  // Also build a map of audiNo + siteId -> audi ID for finding existing audis
  const audiByNumberAndSite = new Map<string, string>(); // "siteId:audiNo" -> audi ID
  existingAudis.forEach(audi => {
    const key = `${audi.siteId}:${audi.audiNo}`;
    audiByNumberAndSite.set(key, audi.id);
  });

  // Get all projectors
  const allProjectors = await prisma.projector.findMany();
  const projectorMap = new Map<string, string>(); // serial -> projector ID
  allProjectors.forEach(p => {
    const serial = normalizeSerial(p.serialNumber);
    if (serial) {
      projectorMap.set(serial, p.id);
    }
  });

  // Process Excel data
  let created = 0;
  let linked = 0;
  let errors = 0;

  for (const row of audisData) {
    const serial = normalizeSerial(
      row.serialNumber || row.SerialNumber || row.serial_number || 
      row.unitSerial || row.UnitSerial || ''
    );
    const siteName = String(row.siteName || row.SiteName || row.site_name || '').trim();
    const audiNo = String(row.audiNo || row.AudiNo || row.audi_no || row.audiNumber || row.AudiNumber || '').trim();

    if (!serial || !siteName || !audiNo) {
      continue;
    }

    // Check if audi already exists for this serial (with matching projector)
    if (existingAudiMap.has(serial)) {
      continue; // Already exists with correct projector
    }

    // Find or create site
    let site = allSites.find(s => 
      normalizeSiteName(s.siteName) === normalizeSiteName(siteName)
    );

    if (!site) {
      // Try exact match
      site = allSites.find(s => s.siteName === siteName);
    }

    if (!site) {
      // Create site
      console.log(`📝 Creating site: "${siteName}"`);
      site = await prisma.site.create({
        data: { siteName: siteName },
      });
      allSites.push(site);
      const normalized = normalizeSiteName(site.siteName);
      siteMap.set(normalized, site.id);
    }

    // Find or create projector
    let projector = null;
    if (projectorMap.has(serial)) {
      projector = await prisma.projector.findUnique({
        where: { id: projectorMap.get(serial)! },
      });
    } else {
      // Create projector if it doesn't exist
      const firstModel = await prisma.projectorModel.findFirst();
      if (!firstModel) {
        console.log(`❌ No projector models found. Cannot create projector for serial ${serial}`);
        errors++;
        continue;
      }
      console.log(`📝 Creating projector: ${serial}`);
      projector = await prisma.projector.create({
        data: {
          serialNumber: serial,
          projectorModelId: firstModel.id,
          status: 'active',
        },
      });
      projectorMap.set(serial, projector.id);
    }

    if (!projector) {
      console.log(`❌ Could not create/find projector for serial ${serial}`);
      errors++;
      continue;
    }

    // Check if audi with this number already exists at this site
    const key = `${site.id}:${audiNo}`;
    let existingAudiAtSite = audiByNumberAndSite.has(key) 
      ? await prisma.audi.findUnique({ where: { id: audiByNumberAndSite.get(key)! } })
      : null;

    if (!existingAudiAtSite) {
      existingAudiAtSite = await prisma.audi.findFirst({
        where: {
          siteId: site.id,
          audiNo: audiNo,
        },
      });
    }

    if (existingAudiAtSite) {
      // Link projector to existing audi (even if it already has one, update it)
      await prisma.audi.update({
        where: { id: existingAudiAtSite.id },
        data: { projectorId: projector.id },
      });
      console.log(`✅ Linked projector ${serial} to existing audi ${audiNo} at ${siteName}`);
      linked++;
      existingAudiMap.set(serial, existingAudiAtSite.id);
      audiByNumberAndSite.set(key, existingAudiAtSite.id);
    } else {
      // Create new audi
      const newAudi = await prisma.audi.create({
        data: {
          audiNo: audiNo,
          siteId: site.id,
          projectorId: projector.id,
        },
      });
      console.log(`✅ Created audi ${audiNo} for serial ${serial} at ${siteName}`);
      created++;
      existingAudiMap.set(serial, newAudi.id);
      audiByNumberAndSite.set(key, newAudi.id);
    }
  }

  console.log(`\n✅ Created ${created} new audi(s)`);
  console.log(`✅ Linked ${linked} projector(s) to existing audis\n`);

  // Rebuild existingAudiMap after all updates
  const updatedAudis = await prisma.audi.findMany({
    include: {
      projector: true,
    },
  });

  existingAudiMap.clear();
  updatedAudis.forEach(audi => {
    if (audi.projector) {
      const serial = normalizeSerial(audi.projector.serialNumber);
      if (serial) {
        existingAudiMap.set(serial, audi.id);
      }
    }
  });

  console.log(`📊 Rebuilt audi map: ${existingAudiMap.size} serial numbers with audis\n`);

  // Now fix orphaned DTR and RMA cases
  console.log('🔧 Fixing orphaned DTR and RMA cases...\n');

  // Get all DTR cases with serial numbers
  const allDTRCases = await prisma.dtrCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
        },
      },
    },
  });

  let fixedDTR = 0;
  for (const dtr of allDTRCases) {
    const serial = normalizeSerial(dtr.unitSerial);
    if (!serial) continue;

    // Check if serial has correct audi
    const hasCorrectAudi = dtr.audi && 
                          dtr.audi.projector && 
                          normalizeSerial(dtr.audi.projector.serialNumber) === serial;

    if (!hasCorrectAudi) {
      if (existingAudiMap.has(serial)) {
        // Link to correct audi
        await prisma.dtrCase.update({
          where: { id: dtr.id },
          data: { audiId: existingAudiMap.get(serial)! },
        });
        console.log(`✅ Fixed DTR case ${dtr.caseNumber} (Serial: ${serial})`);
        fixedDTR++;
      } else {
        // Try to find/create audi from Excel data
        const excelRow = audisData.find((r: any) => 
          normalizeSerial(r.serialNumber || r.SerialNumber || r.unitSerial || r.UnitSerial) === serial
        );
        if (excelRow) {
          const siteName = String(excelRow.siteName || excelRow.SiteName || '').trim();
          const audiNo = String(excelRow.audiNo || excelRow.AudiNo || '').trim();
          const site = allSites.find(s => normalizeSiteName(s.siteName) === normalizeSiteName(siteName));
          if (site) {
            let audi = await prisma.audi.findFirst({
              where: { siteId: site.id, audiNo: audiNo },
            });
            if (!audi) {
              const projector = await prisma.projector.findFirst({ where: { serialNumber: serial } });
              if (projector) {
                audi = await prisma.audi.create({
                  data: { audiNo: audiNo, siteId: site.id, projectorId: projector.id },
                });
                console.log(`✅ Created audi ${audiNo} for serial ${serial}`);
              }
            } else if (!audi.projectorId) {
              const projector = await prisma.projector.findFirst({ where: { serialNumber: serial } });
              if (projector) {
                await prisma.audi.update({ where: { id: audi.id }, data: { projectorId: projector.id } });
                console.log(`✅ Linked projector ${serial} to audi ${audiNo}`);
              }
            }
            if (audi) {
              await prisma.dtrCase.update({ where: { id: dtr.id }, data: { audiId: audi.id } });
              console.log(`✅ Fixed DTR case ${dtr.caseNumber} (Serial: ${serial})`);
              fixedDTR++;
              existingAudiMap.set(serial, audi.id);
            }
          }
        }
      }
    }
  }

  // Get all RMA cases with serial numbers
  const allRMACases = await prisma.rmaCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
        },
      },
    },
  });

  let fixedRMA = 0;
  for (const rma of allRMACases) {
    const serial = normalizeSerial(rma.serialNumber);
    if (!serial) continue;

    // Check if serial has correct audi
    const hasCorrectAudi = rma.audi && 
                          rma.audi.projector && 
                          normalizeSerial(rma.audi.projector.serialNumber) === serial;

    if (!hasCorrectAudi) {
      if (existingAudiMap.has(serial)) {
        // Link to correct audi
        await prisma.rmaCase.update({
          where: { id: rma.id },
          data: { audiId: existingAudiMap.get(serial)! },
        });
        console.log(`✅ Fixed RMA case ${rma.rmaNumber || rma.id.substring(0, 8)} (Serial: ${serial})`);
        fixedRMA++;
      } else {
        // Try to find/create audi from Excel data
        const excelRow = audisData.find((r: any) => 
          normalizeSerial(r.serialNumber || r.SerialNumber || r.unitSerial || r.UnitSerial) === serial
        );
        if (excelRow) {
          const siteName = String(excelRow.siteName || excelRow.SiteName || '').trim();
          const audiNo = String(excelRow.audiNo || excelRow.AudiNo || '').trim();
          const site = allSites.find(s => normalizeSiteName(s.siteName) === normalizeSiteName(siteName));
          if (site) {
            let audi = await prisma.audi.findFirst({
              where: { siteId: site.id, audiNo: audiNo },
            });
            if (!audi) {
              const projector = await prisma.projector.findFirst({ where: { serialNumber: serial } });
              if (projector) {
                audi = await prisma.audi.create({
                  data: { audiNo: audiNo, siteId: site.id, projectorId: projector.id },
                });
                console.log(`✅ Created audi ${audiNo} for serial ${serial}`);
              }
            } else if (!audi.projectorId) {
              const projector = await prisma.projector.findFirst({ where: { serialNumber: serial } });
              if (projector) {
                await prisma.audi.update({ where: { id: audi.id }, data: { projectorId: projector.id } });
                console.log(`✅ Linked projector ${serial} to audi ${audiNo}`);
              }
            }
            if (audi) {
              await prisma.rmaCase.update({ where: { id: rma.id }, data: { audiId: audi.id } });
              console.log(`✅ Fixed RMA case ${rma.rmaNumber || rma.id.substring(0, 8)} (Serial: ${serial})`);
              fixedRMA++;
              existingAudiMap.set(serial, audi.id);
            }
          }
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedDTR} DTR case(s)`);
  console.log(`✅ Fixed ${fixedRMA} RMA case(s)\n`);

  // Final summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Created Audis: ${created}`);
  console.log(`✅ Linked Projectors: ${linked}`);
  console.log(`✅ Fixed DTR Cases: ${fixedDTR}`);
  console.log(`✅ Fixed RMA Cases: ${fixedRMA}`);
  console.log(`❌ Errors: ${errors}\n`);
}

createMissingAudis()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

