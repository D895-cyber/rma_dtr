// Script to delete all RMA cases from database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearRMACases() {
  console.log('🗑️  Clearing all RMA cases from database...\n');

  try {
    // Delete all RMA cases
    const result = await prisma.rmaCase.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} RMA case(s)`);
    console.log('\n✨ Database cleared! Ready for fresh import.');
  } catch (error: any) {
    console.error('❌ Error clearing RMA cases:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearRMACases()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });





