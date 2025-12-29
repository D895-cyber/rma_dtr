// Clear all data except admin user

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('🗑️  Clearing all data except admin user...\n');

    // Delete in order to respect foreign key constraints
    console.log('Deleting notifications...');
    await prisma.notification.deleteMany({});
    console.log('✅ Notifications deleted\n');

    console.log('Deleting audit logs...');
    await prisma.auditLog.deleteMany({});
    console.log('✅ Audit logs deleted\n');

    console.log('Deleting RMA cases...');
    await prisma.rmaCase.deleteMany({});
    console.log('✅ RMA cases deleted\n');

    console.log('Deleting DTR cases...');
    await prisma.dtrCase.deleteMany({});
    console.log('✅ DTR cases deleted\n');

    console.log('Deleting parts...');
    await prisma.part.deleteMany({});
    console.log('✅ Parts deleted\n');

    console.log('Deleting audis...');
    await prisma.audi.deleteMany({});
    console.log('✅ Audis deleted\n');

    console.log('Deleting projectors...');
    await prisma.projector.deleteMany({});
    console.log('✅ Projectors deleted\n');

    console.log('Deleting projector models...');
    await prisma.projectorModel.deleteMany({});
    console.log('✅ Projector models deleted\n');

    console.log('Deleting sites...');
    await prisma.site.deleteMany({});
    console.log('✅ Sites deleted\n');

    // Delete all users except admin
    console.log('Deleting non-admin users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          not: 'admin@crm.com',
        },
      },
    });
    console.log(`✅ Deleted ${deletedUsers.count} non-admin users\n`);

    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@crm.com' },
    });

    if (adminUser) {
      console.log('✅ Admin user exists:');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Role: ${adminUser.role}`);
    } else {
      console.log('⚠️  Admin user not found in database!');
      console.log('   Please run the backend and register admin@crm.com first.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All data cleared! Only admin user remains.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });








