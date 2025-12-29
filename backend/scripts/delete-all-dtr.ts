// Delete all existing DTR cases
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllDTR() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Deleting All Existing DTR Cases                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Count existing cases
  const dtrCount = await prisma.dtrCase.count();
  console.log(`📊 Found ${dtrCount} DTR cases in database\n`);

  if (dtrCount === 0) {
    console.log('✅ No DTR cases to delete.\n');
    return;
  }

  // Delete audit logs first
  console.log('🗑️  Deleting audit logs...');
  const auditLogCount = await prisma.auditLog.deleteMany({
    where: {
      caseType: 'DTR',
    },
  });
  console.log(`   ✅ Deleted ${auditLogCount.count} audit log(s)\n`);

  // Delete DTR cases
  console.log('🗑️  Deleting DTR cases...');
  const deleteResult = await prisma.dtrCase.deleteMany({});
  console.log(`   ✅ Deleted ${deleteResult.count} DTR case(s)\n`);

  console.log('✅ All DTR cases deleted successfully!\n');
}

deleteAllDTR()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





