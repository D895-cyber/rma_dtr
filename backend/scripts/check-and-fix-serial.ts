// Quick check and fix for specific serial
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

async function checkAndFix() {
  const serial = '312610003';
  
  // Check if audi exists
  const audi = await prisma.audi.findFirst({
    where: {
      projector: {
        serialNumber: serial,
      },
    },
    include: {
      projector: true,
      site: true,
    },
  });

  console.log(`Audi for ${serial}:`, audi ? `audiNo=${audi.audiNo}, site=${audi.site.siteName}` : 'NOT FOUND');

  // Check Excel
  const filePath = path.join(__dirname, '../data', 'audis.xlsx');
  const workbook = XLSX.readFile(filePath);
  const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  const excelRow = data.find((r: any) => normalizeSerial(r.serialNumber || r.SerialNumber) === serial);
  
  if (excelRow) {
    const audiNo = String(excelRow.audiNo || excelRow.AudiNo || '');
    const siteName = String(excelRow.siteName || excelRow.SiteName || '');
    console.log(`Excel data: audiNo=${audiNo}, site=${siteName}`);
    
    // Find site
    const site = await prisma.site.findFirst({
      where: { siteName: siteName },
    });
    
    if (!site) {
      console.log('Site not found!');
      return;
    }
    
    // Find or create projector
    let projector = await prisma.projector.findFirst({
      where: { serialNumber: serial },
    });
    
    if (!projector) {
      const firstModel = await prisma.projectorModel.findFirst();
      if (!firstModel) {
        console.log('No projector models!');
        return;
      }
      projector = await prisma.projector.create({
        data: {
          serialNumber: serial,
          projectorModelId: firstModel.id,
          status: 'active',
        },
      });
      console.log('Created projector');
    }
    
    // Find or create audi
    let audiToUse = await prisma.audi.findFirst({
      where: {
        siteId: site.id,
        audiNo: audiNo,
      },
    });
    
    if (!audiToUse) {
      audiToUse = await prisma.audi.create({
        data: {
          audiNo: audiNo,
          siteId: site.id,
          projectorId: projector.id,
        },
      });
      console.log('Created audi');
    } else {
      await prisma.audi.update({
        where: { id: audiToUse.id },
        data: { projectorId: projector.id },
      });
      console.log('Updated audi with projector');
    }
    
    // Fix cases
    const dtrCases = await prisma.dtrCase.findMany({
      where: { unitSerial: serial },
    });
    
    for (const dtr of dtrCases) {
      await prisma.dtrCase.update({
        where: { id: dtr.id },
        data: { audiId: audiToUse.id },
      });
      console.log(`Fixed DTR case ${dtr.caseNumber}`);
    }
    
    const rmaCases = await prisma.rmaCase.findMany({
      where: { serialNumber: serial },
    });
    
    for (const rma of rmaCases) {
      await prisma.rmaCase.update({
        where: { id: rma.id },
        data: { audiId: audiToUse.id },
      });
      console.log(`Fixed RMA case ${rma.rmaNumber || rma.id.substring(0, 8)}`);
    }
  }
}

checkAndFix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

