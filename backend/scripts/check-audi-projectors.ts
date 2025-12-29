// Check and report audi-projector linkage status

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAudiProjectors() {
  try {
    console.log('🔍 Checking Audi-Projector Linkage...\n');
    
    // Get all audis with their projectors
    const audis = await prisma.audi.findMany({
      include: {
        projector: {
          include: {
            projectorModel: true,
          },
        },
        site: true,
      },
    });
    
    const totalAudis = audis.length;
    const audisWithProjectors = audis.filter(a => a.projector !== null).length;
    const audisWithoutProjectors = totalAudis - audisWithProjectors;
    
    console.log(`📊 Summary:`);
    console.log(`   Total Audis: ${totalAudis}`);
    console.log(`   With Projectors: ${audisWithProjectors}`);
    console.log(`   Without Projectors: ${audisWithoutProjectors}\n`);
    
    if (audisWithoutProjectors > 0) {
      console.log(`⚠️  Audis without projectors:\n`);
      audis
        .filter(a => a.projector === null)
        .slice(0, 20) // Show first 20
        .forEach(audi => {
          console.log(`   - ${audi.audiNo} at ${audi.site.siteName}`);
        });
      
      if (audisWithoutProjectors > 20) {
        console.log(`   ... and ${audisWithoutProjectors - 20} more\n`);
      }
    }
    
    // Check if projectors exist
    const totalProjectors = await prisma.projector.count();
    console.log(`\n📽️  Projectors in database: ${totalProjectors}`);
    
    if (totalProjectors === 0) {
      console.log(`\n⚠️  WARNING: No projectors found in database!`);
      console.log(`   You need to import projectors first before linking them to audis.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAudiProjectors()
  .then(() => {
    console.log('\n🎉 Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });








