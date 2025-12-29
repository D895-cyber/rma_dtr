// Clear only Audis, Projectors, and Projector Models (keep Sites and other data)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearMasterData() {
  try {
    console.log('🗑️  Clearing Audis, Projectors, and Projector Models...\n');

    // Delete in order to respect foreign key constraints
    console.log('Deleting audis...');
    const deletedAudis = await prisma.audi.deleteMany({});
    console.log(`✅ Deleted ${deletedAudis.count} audis\n`);

    console.log('Deleting projectors...');
    const deletedProjectors = await prisma.projector.deleteMany({});
    console.log(`✅ Deleted ${deletedProjectors.count} projectors\n`);

    console.log('Deleting projector models...');
    const deletedModels = await prisma.projectorModel.deleteMany({});
    console.log(`✅ Deleted ${deletedModels.count} projector models\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Master data cleared!');
    console.log('   Sites remain intact.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error clearing master data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearMasterData()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });








