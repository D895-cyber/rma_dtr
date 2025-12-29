// Delete all existing RMA cases
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllRMA() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Deleting All Existing RMA Cases                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Count existing cases
  const rmaCount = await prisma.rmaCase.count();
  console.log(`📊 Found ${rmaCount} RMA cases in database\n`);

  if (rmaCount === 0) {
    console.log('✅ No RMA cases to delete.\n');
    return;
  }

  // Delete audit logs first
  console.log('🗑️  Deleting audit logs...');
  const auditLogCount = await prisma.auditLog.deleteMany({
    where: {
      caseType: 'RMA',
    },
  });
  console.log(`   ✅ Deleted ${auditLogCount.count} audit log(s)\n`);

  // Delete RMA cases
  console.log('🗑️  Deleting RMA cases...');
  const deleteResult = await prisma.rmaCase.deleteMany({});
  console.log(`   ✅ Deleted ${deleteResult.count} RMA case(s)\n`);

  console.log('✅ All RMA cases deleted successfully!\n');
}

deleteAllRMA()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





