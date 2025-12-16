// Script to delete all DTR cases from database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDTRCases() {
  console.log('🗑️  Clearing all DTR cases from database...\n');

  try {
    // Delete all DTR cases
    const result = await prisma.dtrCase.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} DTR case(s)`);
    console.log('\n✨ Database cleared! Ready for fresh import.');
  } catch (error: any) {
    console.error('❌ Error clearing DTR cases:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDTRCases()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });



