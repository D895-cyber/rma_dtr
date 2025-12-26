// Fix remaining serial numbers
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

async function fixSerials() {
  const serials = ['312610003'];
  
  // Read Excel
  const filePath = path.join(__dirname, '../data', 'audis.xlsx');
  const workbook = XLSX.readFile(filePath);
  const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  // Get all sites
  const allSites = await prisma.site.findMany();
  
  for (const serial of serials) {
    console.log(`\n🔧 Processing serial ${serial}...`);
    
    const excelRow = data.find((r: any) => 
      normalizeSerial(r.serialNumber || r.SerialNumber || r.unitSerial || r.UnitSerial) === serial
    );
    
    if (!excelRow) {
      console.log(`  ❌ Not found in Excel`);
      continue;
    }
    
    const audiNo = String(excelRow.audiNo || excelRow.AudiNo || '').trim();
    const siteName = String(excelRow.siteName || excelRow.SiteName || '').trim();
    
    console.log(`  📋 Excel: audiNo=${audiNo}, site=${siteName}`);
    
    // Find site
    const site = allSites.find(s => 
      s.siteName.toLowerCase().trim() === siteName.toLowerCase().trim()
    );
    
    if (!site) {
      console.log(`  ❌ Site not found`);
      continue;
    }
    
    // Find or create projector
    let projector = await prisma.projector.findFirst({
      where: { serialNumber: serial },
    });
    
    if (!projector) {
      const firstModel = await prisma.projectorModel.findFirst();
      if (!firstModel) {
        console.log(`  ❌ No projector models`);
        continue;
      }
      projector = await prisma.projector.create({
        data: {
          serialNumber: serial,
          projectorModelId: firstModel.id,
          status: 'active',
        },
      });
      console.log(`  ✅ Created projector`);
    }
    
    // Find or create audi
    let audi = await prisma.audi.findFirst({
      where: {
        siteId: site.id,
        audiNo: audiNo,
      },
    });
    
    if (!audi) {
      audi = await prisma.audi.create({
        data: {
          audiNo: audiNo,
          siteId: site.id,
          projectorId: projector.id,
        },
      });
      console.log(`  ✅ Created audi ${audiNo}`);
    } else {
      await prisma.audi.update({
        where: { id: audi.id },
        data: { projectorId: projector.id },
      });
      console.log(`  ✅ Updated audi ${audiNo} with projector`);
    }
    
    // Fix DTR cases
    const dtrCases = await prisma.dtrCase.findMany({
      where: { unitSerial: serial },
    });
    
    for (const dtr of dtrCases) {
      await prisma.dtrCase.update({
        where: { id: dtr.id },
        data: { audiId: audi.id },
      });
      console.log(`  ✅ Fixed DTR case ${dtr.caseNumber}`);
    }
    
    // Fix RMA cases
    const rmaCases = await prisma.rmaCase.findMany({
      where: { serialNumber: serial },
    });
    
    for (const rma of rmaCases) {
      await prisma.rmaCase.update({
        where: { id: rma.id },
        data: { audiId: audi.id },
      });
      console.log(`  ✅ Fixed RMA case ${rma.rmaNumber || rma.id.substring(0, 8)}`);
    }
  }
  
  console.log(`\n✅ Done!\n`);
}

fixSerials()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

