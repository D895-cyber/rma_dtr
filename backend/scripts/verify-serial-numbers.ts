// Script to verify serial numbers from AUTO-XXX audis in Excel data

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

async function verifySerialNumbers() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        Verifying Serial Numbers in Excel Data                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Get serial numbers from AUTO-XXX audis
  const autoAudis = await prisma.audi.findMany({
    where: {
      audiNo: {
        startsWith: 'AUTO-',
      },
    },
    include: {
      projector: true,
      site: true,
    },
  });

  console.log(`📊 Found ${autoAudis.length} AUTO-XXX audis\n`);

  // Read Excel files
  console.log('📖 Reading Excel files...\n');
  const dtrData = readExcelFile('dtr_cases.xlsx');
  const audisData = readExcelFile('audis.xlsx');

  console.log(`   dtr_cases.xlsx: ${dtrData.length} rows`);
  console.log(`   audis.xlsx: ${audisData.length} rows\n`);

  // Show column names from Excel files
  if (dtrData.length > 0) {
    console.log('📋 Columns in dtr_cases.xlsx:');
    console.log(`   ${Object.keys(dtrData[0]).join(', ')}\n`);
  }

  if (audisData.length > 0) {
    console.log('📋 Columns in audis.xlsx:');
    console.log(`   ${Object.keys(audisData[0]).join(', ')}\n`);
  }

  // Create maps for quick lookup
  const dtrBySerial = new Map<string, any>();
  const audisBySerial = new Map<string, any>();

  // Index DTR data by serial number
  for (const row of dtrData) {
    const serial = String(row.serialNumber || row.unitSerial || row.SerialNumber || row.UnitSerial || '').trim();
    if (serial) {
      dtrBySerial.set(serial, row);
    }
  }

  // Index audis data by serial number
  for (const row of audisData) {
    const serial = String(row.serialNumber || row.SerialNumber || '').trim();
    if (serial) {
      audisBySerial.set(serial, row);
    }
  }

  console.log(`📊 Indexed ${dtrBySerial.size} serial numbers from DTR cases`);
  console.log(`📊 Indexed ${audisBySerial.size} serial numbers from audis\n`);

  // Check each AUTO-XXX audi
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    Verification Results                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let foundInDTR = 0;
  let foundInAudis = 0;
  let notFound = 0;

  for (const audi of autoAudis) {
    if (!audi.projector) {
      console.log(`⚠️  ${audi.audiNo}: No projector assigned`);
      continue;
    }

    const serialNumber = audi.projector.serialNumber;
    const dtrMatch = dtrBySerial.get(serialNumber);
    const audisMatch = audisBySerial.get(serialNumber);

    console.log(`\n🔍 Serial: ${serialNumber} (${audi.audiNo})`);
    console.log(`   Current Site: ${audi.site.siteName}`);

    if (dtrMatch) {
      foundInDTR++;
      console.log(`   ✅ Found in dtr_cases.xlsx:`);
      console.log(`      - Site: ${dtrMatch.siteName || dtrMatch.SiteName || '(not found)'}`);
      console.log(`      - Audi: ${dtrMatch.audiNo || dtrMatch.AudiNo || dtrMatch.audi_no || '(not found)'}`);
      console.log(`      - Model: ${dtrMatch.unitModel || dtrMatch.UnitModel || dtrMatch.unit_model || '(not found)'}`);
      console.log(`      - Case: ${dtrMatch.caseNumber || dtrMatch.CaseNumber || dtrMatch.case_number || 'N/A'}`);
    } else {
      console.log(`   ❌ NOT found in dtr_cases.xlsx`);
    }

    if (audisMatch) {
      foundInAudis++;
      console.log(`   ✅ Found in audis.xlsx:`);
      console.log(`      - Site: ${audisMatch.siteName || audisMatch.SiteName || audisMatch.site_name || '(not found)'}`);
      console.log(`      - Audi: ${audisMatch.audiNo || audisMatch.AudiNo || audisMatch.audi_no || '(not found)'}`);
    } else {
      console.log(`   ❌ NOT found in audis.xlsx`);
    }

    if (!dtrMatch && !audisMatch) {
      notFound++;
      console.log(`   ⚠️  This serial number is NOT in any Excel file!`);
    }

    // Show all possible serial number variations from Excel
    if (!dtrMatch && !audisMatch) {
      console.log(`   🔍 Checking for similar serial numbers in Excel...`);
      const allSerials = new Set<string>();
      dtrData.forEach(row => {
        const s1 = String(row.serialNumber || '').trim();
        const s2 = String(row.unitSerial || '').trim();
        const s3 = String(row.SerialNumber || '').trim();
        const s4 = String(row.UnitSerial || '').trim();
        if (s1) allSerials.add(s1);
        if (s2) allSerials.add(s2);
        if (s3) allSerials.add(s3);
        if (s4) allSerials.add(s4);
      });
      audisData.forEach(row => {
        const s1 = String(row.serialNumber || '').trim();
        const s2 = String(row.SerialNumber || '').trim();
        if (s1) allSerials.add(s1);
        if (s2) allSerials.add(s2);
      });
      
      // Check for partial matches
      const partialMatches = Array.from(allSerials).filter(s => 
        s.includes(serialNumber) || serialNumber.includes(s)
      );
      
      if (partialMatches.length > 0) {
        console.log(`   💡 Found similar serial numbers: ${partialMatches.slice(0, 5).join(', ')}`);
      }
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Found in DTR cases: ${foundInDTR}`);
  console.log(`✅ Found in audis: ${foundInAudis}`);
  console.log(`❌ Not found in any file: ${notFound}`);
  console.log(`📊 Total AUTO-XXX audis: ${autoAudis.length}\n`);

  // Show sample serial numbers from Excel for reference
  console.log('📋 Sample serial numbers from Excel files:');
  console.log('   From dtr_cases.xlsx (first 10):');
  Array.from(dtrBySerial.keys()).slice(0, 10).forEach(serial => {
    console.log(`      - ${serial}`);
  });
  if (audisBySerial.size > 0) {
    console.log('   From audis.xlsx (first 10):');
    Array.from(audisBySerial.keys()).slice(0, 10).forEach(serial => {
      console.log(`      - ${serial}`);
    });
  }
  console.log('');
}

verifySerialNumbers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





