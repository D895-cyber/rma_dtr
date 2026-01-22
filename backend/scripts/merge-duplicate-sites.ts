// Merge duplicate sites - fix typo in "Suman City Ghandhinagar"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeDuplicateSites() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Merge Duplicate Sites                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Find the sites
  const correctSite = await prisma.site.findFirst({
    where: { siteName: 'Suman City Gandhinagar' },
    include: {
      audis: true,
    },
  });

  const typoSite = await prisma.site.findFirst({
    where: { siteName: 'Suman City Ghandhinagar' },
    include: {
      audis: true,
    },
  });

  if (!correctSite) {
    console.log('❌ Correct site "Suman City Gandhinagar" not found\n');
    return;
  }

  if (!typoSite) {
    console.log('❌ Typo site "Suman City Ghandhinagar" not found\n');
    return;
  }

  console.log(`📊 Correct site: "${correctSite.siteName}"`);
  console.log(`   ID: ${correctSite.id}`);
  console.log(`   Audis: ${correctSite.audis.length}\n`);

  console.log(`📊 Typo site: "${typoSite.siteName}"`);
  console.log(`   ID: ${typoSite.id}`);
  console.log(`   Audis: ${typoSite.audis.length}\n`);

  if (typoSite.audis.length === 0) {
    console.log('ℹ️  Typo site has no audis, just deleting it...\n');
    await prisma.site.delete({
      where: { id: typoSite.id },
    });
    console.log('✅ Deleted typo site\n');
    return;
  }

  // Move audis from typo site to correct site
  console.log(`📝 Moving ${typoSite.audis.length} audi(s) from typo site to correct site...\n`);

  for (const audi of typoSite.audis) {
    console.log(`   Moving Audi ${audi.audiNo}...`);
    
    // Check if audi number already exists in correct site
    const existingAudi = await prisma.audi.findFirst({
      where: {
        siteId: correctSite.id,
        audiNo: audi.audiNo,
      },
    });

    if (existingAudi) {
      console.log(`      ⚠️  Audi ${audi.audiNo} already exists in correct site`);
      console.log(`      ℹ️  Keeping both (they may have different projectors)`);
    }

    await prisma.audi.update({
      where: { id: audi.id },
      data: {
        siteId: correctSite.id,
      },
    });
    console.log(`      ✅ Moved Audi ${audi.audiNo}`);
  }

  // Check for RMA and DTR cases that reference the typo site
  const rmaCases = await prisma.rmaCase.count({
    where: { siteId: typoSite.id },
  });

  const dtrCases = await prisma.dtrCase.count({
    where: { siteId: typoSite.id },
  });

  if (rmaCases > 0 || dtrCases > 0) {
    console.log(`\n📝 Moving cases to correct site...`);
    console.log(`   RMA cases: ${rmaCases}`);
    console.log(`   DTR cases: ${dtrCases}\n`);

    if (rmaCases > 0) {
      await prisma.rmaCase.updateMany({
        where: { siteId: typoSite.id },
        data: { siteId: correctSite.id },
      });
      console.log(`   ✅ Moved ${rmaCases} RMA case(s)`);
    }

    if (dtrCases > 0) {
      await prisma.dtrCase.updateMany({
        where: { siteId: typoSite.id },
        data: { siteId: correctSite.id },
      });
      console.log(`   ✅ Moved ${dtrCases} DTR case(s)`);
    }
  }

  // Delete the typo site
  console.log(`\n🗑️  Deleting typo site...`);
  await prisma.site.delete({
    where: { id: typoSite.id },
  });
  console.log(`✅ Deleted typo site: "${typoSite.siteName}"\n`);

  // Verify
  const finalSite = await prisma.site.findUnique({
    where: { id: correctSite.id },
    include: {
      audis: true,
      rmaCases: true,
      dtrCases: true,
    },
  });

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Verification                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (finalSite) {
    console.log(`✅ Final site: "${finalSite.siteName}"`);
    console.log(`   Audis: ${finalSite.audis.length}`);
    console.log(`   RMA cases: ${finalSite.rmaCases.length}`);
    console.log(`   DTR cases: ${finalSite.dtrCases.length}\n`);
  }

  // Check if typo site still exists
  const typoStillExists = await prisma.site.findUnique({
    where: { id: typoSite.id },
  });

  if (typoStillExists) {
    console.log('❌ Typo site still exists');
  } else {
    console.log('✅ Typo site successfully deleted');
  }

  console.log('\n✅ Merge complete!\n');
}

mergeDuplicateSites()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
