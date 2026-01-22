// Check for projectors and RMA cases with UNKNOWN model/product name
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUnknownModels() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Check for UNKNOWN Projector Models                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Find projectors with UNKNOWN model
  const unknownModel = await prisma.projectorModel.findFirst({
    where: { modelNo: 'UNKNOWN' },
  });

  if (!unknownModel) {
    console.log('✅ No UNKNOWN projector model found\n');
  } else {
    console.log(`📊 Found UNKNOWN projector model (ID: ${unknownModel.id})\n`);

    // Find all projectors using this model
    const projectorsWithUnknown = await prisma.projector.findMany({
      where: {
        projectorModelId: unknownModel.id,
      },
      select: {
        id: true,
        serialNumber: true,
        projectorModel: {
          select: {
            modelNo: true,
          },
        },
      },
      orderBy: {
        serialNumber: 'asc',
      },
    });

    console.log(`📊 Projectors with UNKNOWN model: ${projectorsWithUnknown.length}\n`);

    if (projectorsWithUnknown.length > 0) {
      console.log('📋 List of projectors with UNKNOWN model:');
      projectorsWithUnknown.forEach((p, i) => {
        console.log(`   ${i + 1}. Serial: ${p.serialNumber}`);
      });
      console.log('');
    }
  }

  // Check RMA cases with Unknown/UNKNOWN product name
  const rmaCasesWithUnknown = await prisma.rmaCase.findMany({
    where: {
      OR: [
        { productName: 'Unknown' },
        { productName: 'UNKNOWN' },
        { productName: { contains: 'Unknown', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      serialNumber: true,
      productName: true,
      rmaNumber: true,
      callLogNumber: true,
    },
    orderBy: {
      serialNumber: 'asc',
    },
  });

  console.log(`📊 RMA cases with Unknown/UNKNOWN product name: ${rmaCasesWithUnknown.length}\n`);

  if (rmaCasesWithUnknown.length > 0) {
    console.log('📋 List of RMA cases with Unknown product name:');
    
    // Get unique serial numbers
    const uniqueSerials = [...new Set(rmaCasesWithUnknown.map(r => r.serialNumber))];
    
    // Look up projectors for these serials
    const projectors = await prisma.projector.findMany({
      where: {
        serialNumber: { in: uniqueSerials },
      },
      include: {
        projectorModel: {
          select: {
            modelNo: true,
          },
        },
      },
    });

    const projectorMap = new Map(projectors.map(p => [p.serialNumber, p]));

    rmaCasesWithUnknown.forEach((rma, i) => {
      const identifier = rma.rmaNumber || rma.callLogNumber || rma.id;
      const projector = projectorMap.get(rma.serialNumber);
      const projectorModel = projector?.projectorModel?.modelNo || 'N/A';
      console.log(`   ${i + 1}. RMA: ${identifier}, Serial: ${rma.serialNumber}`);
      console.log(`      Current Product Name: "${rma.productName}"`);
      console.log(`      Projector Model: ${projectorModel}`);
      console.log('');
    });
  } else {
    console.log('✅ No RMA cases with Unknown product name found\n');
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const totalUnknownProjectors = unknownModel 
    ? await prisma.projector.count({ where: { projectorModelId: unknownModel.id } })
    : 0;

  console.log(`Projectors with UNKNOWN model: ${totalUnknownProjectors}`);
  console.log(`RMA cases with Unknown product name: ${rmaCasesWithUnknown.length}\n`);

  if (totalUnknownProjectors > 0 || rmaCasesWithUnknown.length > 0) {
    console.log('⚠️  Found cases that need fixing:\n');
    console.log('   - Projectors with UNKNOWN model need to be updated with correct model');
    console.log('   - RMA cases with Unknown product name need to be updated\n');
  } else {
    console.log('✅ No issues found! All projectors and RMA cases have proper model names.\n');
  }

  // Group by serial number to see patterns
  if (rmaCasesWithUnknown.length > 0) {
    const serialGroups = new Map<string, number>();
    rmaCasesWithUnknown.forEach(rma => {
      serialGroups.set(rma.serialNumber, (serialGroups.get(rma.serialNumber) || 0) + 1);
    });

    console.log('📊 RMA cases with Unknown grouped by serial number:');
    Array.from(serialGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([serial, count]) => {
        console.log(`   Serial ${serial}: ${count} case(s)`);
      });
    if (serialGroups.size > 10) {
      console.log(`   ... and ${serialGroups.size - 10} more serial numbers`);
    }
    console.log('');
  }
}

checkUnknownModels()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
