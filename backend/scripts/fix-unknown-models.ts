// Fix UNKNOWN projector models with correct model numbers
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serialToModel: Record<string, string> = {
  '277496013': 'CP2220',
  '317517015': 'CP2220',
  '345198012': 'CP2215',
  '549779002': 'UNKNOWN', // Not provided, keep as is
  '558583016': 'UNKNOWN', // Not provided, keep as is
};

async function fixUnknownModels() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Fix UNKNOWN Projector Models                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Get or create the required models
  const modelsToCreate = new Set(Object.values(serialToModel).filter(m => m !== 'UNKNOWN'));
  const modelMap = new Map<string, string>();

  for (const modelNo of modelsToCreate) {
    let model = await prisma.projectorModel.findFirst({
      where: { modelNo },
    });

    if (!model) {
      console.log(`📝 Creating projector model: ${modelNo}...`);
      model = await prisma.projectorModel.create({
        data: {
          modelNo: modelNo,
          manufacturer: modelNo.startsWith('CP') ? 'Christie' : 'Unknown',
          specifications: `Christie ${modelNo} Projector`,
        },
      });
      console.log(`   ✅ Created model: ${model.modelNo}\n`);
    } else {
      console.log(`✅ Model ${modelNo} already exists\n`);
    }

    modelMap.set(modelNo, model.id);
  }

  // Fix each projector
  for (const [serialNumber, modelNo] of Object.entries(serialToModel)) {
    if (modelNo === 'UNKNOWN') {
      console.log(`⏭️  Skipping ${serialNumber} (no model provided)\n`);
      continue;
    }

    console.log(`📝 Fixing projector: ${serialNumber} → ${modelNo}`);

    const projector = await prisma.projector.findUnique({
      where: { serialNumber },
      include: {
        projectorModel: true,
      },
    });

    if (!projector) {
      console.log(`   ⚠️  Projector not found\n`);
      continue;
    }

    const modelId = modelMap.get(modelNo);
    if (!modelId) {
      console.log(`   ⚠️  Model ID not found for ${modelNo}\n`);
      continue;
    }

    // Update projector model
    if (projector.projectorModelId !== modelId) {
      await prisma.projector.update({
        where: { serialNumber },
        data: {
          projectorModelId: modelId,
        },
      });
      console.log(`   ✅ Updated projector model: ${projector.projectorModel?.modelNo || 'UNKNOWN'} → ${modelNo}`);
    } else {
      console.log(`   ⏭️  Projector already has correct model`);
    }

    // Update RMA cases with this serial number
    const rmaCases = await prisma.rmaCase.findMany({
      where: { serialNumber },
      select: {
        id: true,
        productName: true,
        rmaNumber: true,
        callLogNumber: true,
      },
    });

    if (rmaCases.length > 0) {
      console.log(`   📝 Found ${rmaCases.length} RMA case(s) to update:`);
      
      for (const rmaCase of rmaCases) {
        if (rmaCase.productName !== modelNo && rmaCase.productName !== `Christie ${modelNo}`) {
          await prisma.rmaCase.update({
            where: { id: rmaCase.id },
            data: {
              productName: modelNo,
            },
          });
          const identifier = rmaCase.rmaNumber || rmaCase.callLogNumber || rmaCase.id;
          console.log(`      ✅ Updated RMA ${identifier}: "${rmaCase.productName}" → "${modelNo}"`);
        } else {
          const identifier = rmaCase.rmaNumber || rmaCase.callLogNumber || rmaCase.id;
          console.log(`      ⏭️  RMA ${identifier} already has correct product name`);
        }
      }
    } else {
      console.log(`   ℹ️  No RMA cases found for this serial number`);
    }

    console.log('');
  }

  // Verify
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Verification                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  for (const [serialNumber, expectedModel] of Object.entries(serialToModel)) {
    if (expectedModel === 'UNKNOWN') continue;

    const projector = await prisma.projector.findUnique({
      where: { serialNumber },
      include: {
        projectorModel: true,
      },
    });

    if (projector) {
      const actualModel = projector.projectorModel?.modelNo || 'N/A';
      const status = actualModel === expectedModel ? '✅' : '❌';
      console.log(`${status} Serial ${serialNumber}: Model = ${actualModel} (Expected: ${expectedModel})`);
    }

    const rmaCases = await prisma.rmaCase.findMany({
      where: { serialNumber },
      select: {
        productName: true,
        rmaNumber: true,
        callLogNumber: true,
      },
    });

    rmaCases.forEach(rma => {
      const identifier = rma.rmaNumber || rma.callLogNumber || 'N/A';
      const status = rma.productName === expectedModel ? '✅' : '❌';
      console.log(`   ${status} RMA ${identifier}: Product = "${rma.productName}" (Expected: "${expectedModel}")`);
    });
  }

  console.log('\n✅ Fix complete!\n');
}

fixUnknownModels()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
