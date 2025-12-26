// Find DTR/RMA cases with serial numbers that don't have corresponding audis
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to normalize serial number
function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return String(serial).trim().toUpperCase();
}

async function findOrphanedCases() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        Finding Cases with Serial Numbers Without Audis           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Get all projectors that have audis
  const projectorsWithAudis = await prisma.projector.findMany({
    where: {
      audis: {
        some: {},
      },
    },
    select: {
      serialNumber: true,
    },
  });

  const validSerials = new Set<string>();
  projectorsWithAudis.forEach(p => {
    if (p.serialNumber) {
      validSerials.add(normalizeSerial(p.serialNumber));
    }
  });

  console.log(`✅ Found ${validSerials.size} projectors with audis\n`);

  // Check DTR cases
  console.log('🔍 Checking DTR cases...\n');
  const allDTRCases = await prisma.dtrCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
        },
      },
      site: true,
    },
    orderBy: { caseNumber: 'asc' },
  });

  const orphanedDTR: any[] = [];
  for (const dtr of allDTRCases) {
    const serial = normalizeSerial(dtr.unitSerial);
    if (!serial) continue;

    // Check if serial has a valid audi
    const hasValidAudi = dtr.audi && 
                         dtr.audi.projector && 
                         normalizeSerial(dtr.audi.projector.serialNumber) === serial;

    // Check if serial exists in valid projectors
    const existsInValidProjectors = validSerials.has(serial);

    if (!hasValidAudi && !existsInValidProjectors) {
      orphanedDTR.push({
        caseNumber: dtr.caseNumber,
        serialNumber: serial,
        site: dtr.site?.siteName || 'Unknown',
        errorDate: dtr.errorDate,
        natureOfProblem: dtr.natureOfProblem?.substring(0, 60) || '',
        hasAudi: !!dtr.audi,
        audiSerial: dtr.audi?.projector ? normalizeSerial(dtr.audi.projector.serialNumber) : 'None',
      });
    }
  }

  // Check RMA cases
  console.log('🔍 Checking RMA cases...\n');
  const allRMACases = await prisma.rmaCase.findMany({
    include: {
      audi: {
        include: {
          projector: true,
        },
      },
      site: true,
    },
    orderBy: { rmaRaisedDate: 'desc' },
  });

  const orphanedRMA: any[] = [];
  for (const rma of allRMACases) {
    const serial = normalizeSerial(rma.serialNumber);
    if (!serial) continue;

    // Check if serial has a valid audi
    const hasValidAudi = rma.audi && 
                         rma.audi.projector && 
                         normalizeSerial(rma.audi.projector.serialNumber) === serial;

    // Check if serial exists in valid projectors
    const existsInValidProjectors = validSerials.has(serial);

    if (!hasValidAudi && !existsInValidProjectors) {
      orphanedRMA.push({
        rmaNumber: rma.rmaNumber || rma.id.substring(0, 8),
        id: rma.id,
        serialNumber: serial,
        site: rma.site?.siteName || 'Unknown',
        rmaRaisedDate: rma.rmaRaisedDate,
        productName: rma.productName?.substring(0, 50) || '',
        hasAudi: !!rma.audi,
        audiSerial: rma.audi?.projector ? normalizeSerial(rma.audi.projector.serialNumber) : 'None',
      });
    }
  }

  // Display results
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    Orphaned Cases Found                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (orphanedDTR.length === 0 && orphanedRMA.length === 0) {
    console.log('✅ No orphaned cases found! All serial numbers have corresponding audis.\n');
    return;
  }

  if (orphanedDTR.length > 0) {
    console.log(`📋 DTR Cases with Serial Numbers Without Audis: ${orphanedDTR.length}\n`);
    orphanedDTR.forEach((dtr, index) => {
      console.log(`   ${index + 1}. Case #${dtr.caseNumber}`);
      console.log(`      Serial: ${dtr.serialNumber}`);
      console.log(`      Site: ${dtr.site}`);
      console.log(`      Date: ${dtr.errorDate}`);
      console.log(`      Problem: ${dtr.natureOfProblem}...`);
      console.log(`      Current Audi: ${dtr.hasAudi ? `Yes (Serial: ${dtr.audiSerial})` : 'No'}`);
      console.log(`      ⚠️  Serial ${dtr.serialNumber} has NO audi in database`);
      console.log('');
    });
  }

  if (orphanedRMA.length > 0) {
    console.log(`📋 RMA Cases with Serial Numbers Without Audis: ${orphanedRMA.length}\n`);
    orphanedRMA.forEach((rma, index) => {
      console.log(`   ${index + 1}. RMA #${rma.rmaNumber}`);
      console.log(`      Serial: ${rma.serialNumber}`);
      console.log(`      Site: ${rma.site}`);
      console.log(`      Date: ${rma.rmaRaisedDate}`);
      console.log(`      Product: ${rma.productName}...`);
      console.log(`      Current Audi: ${rma.hasAudi ? `Yes (Serial: ${rma.audiSerial})` : 'No'}`);
      console.log(`      ⚠️  Serial ${rma.serialNumber} has NO audi in database`);
      console.log('');
    });
  }

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        Summary                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`🗑️  DTR Cases to Delete: ${orphanedDTR.length}`);
  console.log(`🗑️  RMA Cases to Delete: ${orphanedRMA.length}`);
  console.log(`\n⚠️  These cases reference serial numbers that don't have audis in the database.`);
  console.log(`   They will be deleted if you run the cleanup script.\n`);

  return { orphanedDTR, orphanedRMA };
}

findOrphanedCases()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

