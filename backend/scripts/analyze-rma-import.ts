// Comprehensive analysis before RMA import
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

async function analyzeRmaImport() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Comprehensive RMA Import Analysis                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 1. Check Excel file
  console.log('📄 Step 1: Excel File Analysis\n');
  const rmaData = readExcelFile('rma_cases.xlsx');
  
  if (rmaData.length === 0) {
    console.log('❌ No data found in rma_cases.xlsx');
    return;
  }

  console.log(`✅ Excel file found: ${rmaData.length} rows\n`);

  // 2. Check database prerequisites
  console.log('🗄️  Step 2: Database Prerequisites\n');
  
  const [userCount, siteCount, projectorCount, audiCount] = await Promise.all([
    prisma.user.count(),
    prisma.site.count(),
    prisma.projector.count(),
    prisma.audi.count(),
  ]);

  console.log(`   Users: ${userCount}`);
  console.log(`   Sites: ${siteCount}`);
  console.log(`   Projectors: ${projectorCount}`);
  console.log(`   Audis: ${audiCount}\n`);

  if (userCount === 0) {
    console.log('❌ No users found! Need at least one user (admin@crm.com)\n');
  }

  // 3. Check for required user
  console.log('👤 Step 3: Required User Check\n');
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@crm.com' },
  });

  if (!adminUser) {
    console.log('❌ admin@crm.com user not found!');
    console.log('   This user will be used as creator for cases where createdBy is missing.\n');
  } else {
    console.log(`✅ Admin user found: ${adminUser.email} (${adminUser.name})\n`);
  }

  // 4. Analyze serial numbers
  console.log('🔢 Step 4: Serial Number Analysis\n');
  const serialNumbers = new Set<string>();
  const uniqueSerials = new Set<string>();
  const missingSerials: string[] = [];

  rmaData.forEach((row: any) => {
    const serial = String(row.serialNumber || '').trim();
    if (serial) {
      serialNumbers.add(serial);
      uniqueSerials.add(serial);
    }
  });

  console.log(`   Total serial numbers in Excel: ${serialNumbers.size}`);
  console.log(`   Unique serial numbers: ${uniqueSerials.size}\n`);

  // Check which serials exist in database
  const serialArray = Array.from(uniqueSerials);
  const existingProjectors = await prisma.projector.findMany({
    where: {
      serialNumber: { in: serialArray },
    },
    select: { serialNumber: true },
  });

  const existingSerials = new Set(existingProjectors.map(p => p.serialNumber));
  const missingInDb = serialArray.filter(s => !existingSerials.has(s));

  console.log(`   Serial numbers in database: ${existingSerials.size}`);
  console.log(`   Missing in database: ${missingInDb.length}`);

  if (missingInDb.length > 0) {
    console.log(`   ⚠️  ${missingInDb.length} serial numbers will need projector creation`);
    if (missingInDb.length <= 10) {
      console.log(`   Missing serials: ${missingInDb.join(', ')}\n`);
    } else {
      console.log(`   First 10 missing: ${missingInDb.slice(0, 10).join(', ')}...\n`);
    }
  } else {
    console.log('   ✅ All serial numbers exist in database\n');
  }

  // 5. Check site mapping via audis
  console.log('📍 Step 5: Site Mapping Analysis\n');
  const audisWithSites = await prisma.audi.findMany({
    include: {
      site: true,
      projector: true,
    },
  });

  const serialToSite = new Map<string, string>();
  const serialToSiteName = new Map<string, string>();

  audisWithSites.forEach(audi => {
    if (audi.projector) {
      serialToSite.set(audi.projector.serialNumber, audi.siteId);
      serialToSiteName.set(audi.projector.serialNumber, audi.site.siteName);
    }
  });

  const serialsWithSites = Array.from(uniqueSerials).filter(s => serialToSite.has(s));
  const serialsWithoutSites = Array.from(uniqueSerials).filter(s => !serialToSite.has(s));

  console.log(`   Serial numbers with site mapping: ${serialsWithSites.length}`);
  console.log(`   Serial numbers without site mapping: ${serialsWithoutSites.length}`);

  if (serialsWithoutSites.length > 0) {
    console.log(`   ⚠️  ${serialsWithoutSites.length} serials will need site lookup or default site\n`);
  } else {
    console.log('   ✅ All serial numbers have site mappings\n');
  }

  // 6. Check data quality issues
  console.log('🔍 Step 6: Data Quality Analysis\n');
  
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check status values
  const statusCounts: Record<string, number> = {};
  const invalidStatuses: string[] = [];
  const validStatuses = ['open', 'rma_raised_yet_to_deliver', 'faulty_in_transit_to_cds', 'closed', 'cancelled'];

  rmaData.forEach((row: any) => {
    const status = String(row.status || '').trim().toLowerCase().replace(/\s+/g, '_');
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    if (status && !validStatuses.includes(status)) {
      if (!invalidStatuses.includes(status)) {
        invalidStatuses.push(status);
      }
    }
  });

  console.log(`   Status distribution:`);
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    const isValid = validStatuses.includes(status);
    console.log(`      ${isValid ? '✅' : '❌'} ${status}: ${count}`);
  });

  if (invalidStatuses.length > 0) {
    warnings.push(`Invalid status values found: ${invalidStatuses.join(', ')} (will be normalized)`);
  }

  // Check RMA types
  const rmaTypeCounts: Record<string, number> = {};
  const validRmaTypes = ['RMA', 'SRMA', 'RMA_CL', 'Lamps'];

  rmaData.forEach((row: any) => {
    let rmaType = String(row.rmaType || 'RMA').trim();
    rmaType = rmaType.replace('RMA CI', 'RMA_CL').replace('RMA CL', 'RMA_CL');
    rmaTypeCounts[rmaType] = (rmaTypeCounts[rmaType] || 0) + 1;
  });

  console.log(`\n   RMA Type distribution:`);
  Object.entries(rmaTypeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    const isValid = validRmaTypes.includes(type);
    console.log(`      ${isValid ? '✅' : '❌'} ${type}: ${count}`);
  });

  // Check placeholder values
  let placeholderCount = 0;
  rmaData.forEach((row: any) => {
    if (row.trackingNumberOut === '-' || row.returnTrackingNumber === '-') {
      placeholderCount++;
    }
  });

  if (placeholderCount > 0) {
    console.log(`\n   ⚠️  Found ${placeholderCount} rows with "-" placeholders (will be converted to null)`);
  }

  // Check callLogNumber duplicates
  const callLogNumbers = new Map<string, number>();
  rmaData.forEach((row: any) => {
    if (row.callLogNumber) {
      const callLog = String(row.callLogNumber).trim();
      callLogNumbers.set(callLog, (callLogNumbers.get(callLog) || 0) + 1);
    }
  });

  const duplicateCallLogs = Array.from(callLogNumbers.entries())
    .filter(([_, count]) => count > 1)
    .map(([callLog, count]) => ({ callLog, count }));

  if (duplicateCallLogs.length > 0) {
    console.log(`\n   ⚠️  Found ${duplicateCallLogs.length} duplicate callLogNumbers (will be handled with suffixes)`);
  } else {
    console.log(`\n   ✅ No duplicate callLogNumbers found`);
  }

  // 7. Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const canImport = 
    userCount > 0 &&
    (adminUser !== null || rmaData.every((r: any) => r.createdBy)) &&
    rmaData.length > 0;

  if (canImport) {
    console.log('✅ READY FOR IMPORT\n');
    console.log(`   Total rows to import: ${rmaData.length}`);
    console.log(`   Unique serial numbers: ${uniqueSerials.size}`);
    console.log(`   Projectors to create: ${missingInDb.length}`);
    console.log(`   Site mappings available: ${serialsWithSites.length}/${uniqueSerials.size}\n`);
  } else {
    console.log('❌ NOT READY FOR IMPORT\n');
    if (userCount === 0) {
      console.log('   - No users in database');
    }
    if (!adminUser && rmaData.some((r: any) => !r.createdBy)) {
      console.log('   - admin@crm.com user not found and some rows missing createdBy');
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:\n');
    warnings.forEach(w => console.log(`   - ${w}\n`));
  }

  return {
    canImport,
    totalRows: rmaData.length,
    uniqueSerials: uniqueSerials.size,
    missingProjectors: missingInDb.length,
    siteMappings: serialsWithSites.length,
  };
}

analyzeRmaImport()
  .then((result) => {
    if (result?.canImport) {
      console.log('✅ Analysis complete. Ready to proceed with import.\n');
    } else {
      console.log('❌ Analysis complete. Please fix issues before importing.\n');
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
