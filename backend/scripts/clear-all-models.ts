// Clear all models, projectors, and audis - with explicit .env loading
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllModels() {
  try {
    console.log('🗑️  Deleting all Projector Models, Projectors, and Audis...\n');

    // Delete in correct order due to foreign key constraints
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
    console.log('✅ All models, projectors, and audis deleted!');
    console.log('   Sites remain intact.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllModels()
  .then(() => {
    console.log('🎉 Deletion completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });




