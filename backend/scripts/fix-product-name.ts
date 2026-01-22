// Fix product name for serial number 269531020
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProductName() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Fix Product Name for Serial 269531020                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const serialNumber = '269531020';

  // Find the projector
  const projector = await prisma.projector.findUnique({
    where: { serialNumber },
    include: {
      projectorModel: true,
    },
  });

  if (!projector) {
    console.log(`❌ Projector with serial number "${serialNumber}" not found\n`);
    return;
  }

  console.log(`📊 Projector found:`);
  console.log(`   Serial Number: ${projector.serialNumber}`);
  console.log(`   Current Model: ${projector.projectorModel?.modelNo || 'N/A'}`);
  console.log(`   Model ID: ${projector.projectorModelId}\n`);

  // Check if model needs to be updated
  if (projector.projectorModel?.modelNo !== 'CP2220') {
    // Find or create CP2220 model
    let cp2220Model = await prisma.projectorModel.findFirst({
      where: { modelNo: 'CP2220' },
    });

    if (!cp2220Model) {
      console.log('📝 Creating CP2220 projector model...');
      cp2220Model = await prisma.projectorModel.create({
        data: {
          modelNo: 'CP2220',
          manufacturer: 'Christie',
          specifications: 'Christie CP2220 Projector',
        },
      });
      console.log(`   ✅ Created model: ${cp2220Model.modelNo}\n`);
    }

    // Update projector to use CP2220 model
    console.log('📝 Updating projector model...');
    await prisma.projector.update({
      where: { serialNumber },
      data: {
        projectorModelId: cp2220Model.id,
      },
    });
    console.log(`   ✅ Updated projector to use CP2220 model\n`);
  }

  // Find all RMA cases with this serial number
  const rmaCases = await prisma.rmaCase.findMany({
    where: { serialNumber },
    select: {
      id: true,
      productName: true,
      rmaNumber: true,
      callLogNumber: true,
    },
  });

  console.log(`📊 Found ${rmaCases.length} RMA case(s) with this serial number\n`);

  if (rmaCases.length === 0) {
    console.log('✅ No RMA cases to update\n');
    return;
  }

  // Update RMA cases
  let updated = 0;
  for (const rmaCase of rmaCases) {
    if (rmaCase.productName !== 'CP2220' && rmaCase.productName !== 'Christie CP2220') {
      await prisma.rmaCase.update({
        where: { id: rmaCase.id },
        data: {
          productName: 'CP2220',
        },
      });
      updated++;
      console.log(`   ✅ Updated RMA: ${rmaCase.rmaNumber || rmaCase.callLogNumber || rmaCase.id}`);
      console.log(`      Product Name: "${rmaCase.productName}" → "CP2220"`);
    } else {
      console.log(`   ⏭️  Skipped RMA: ${rmaCase.rmaNumber || rmaCase.callLogNumber || rmaCase.id} (already correct)`);
    }
  }

  console.log(`\n✅ Updated ${updated} RMA case(s)\n`);

  // Verify
  const updatedCases = await prisma.rmaCase.findMany({
    where: { serialNumber },
    select: {
      productName: true,
      rmaNumber: true,
      callLogNumber: true,
    },
  });

  console.log('📊 Verification:');
  updatedCases.forEach(c => {
    console.log(`   RMA: ${c.rmaNumber || c.callLogNumber || 'N/A'} - Product: ${c.productName}`);
  });
  console.log('');

  // Check if all are now CP2220
  const allCorrect = updatedCases.every(c => c.productName === 'CP2220');
  if (allCorrect) {
    console.log('✅ All RMA cases now have correct product name: CP2220\n');
  } else {
    console.log('⚠️  Some cases still need updating\n');
  }
}

fixProductName()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
