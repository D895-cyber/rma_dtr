// Direct fix for site name typos
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSiteNames() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    Fixing Site Name Typos                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Find and fix specific typos
  const fixes = [
    { from: 'Gujarat', to: 'Racecourse Vadodara Gujarat' }, // If it was renamed to just "Gujarat"
    { from: 'Gandhinagar', to: 'Suman City Gandhinagar' }, // If it was renamed to just "Gandhinagar"
  ];

  // First, check what sites exist
  const allSites = await prisma.site.findMany({
    orderBy: { siteName: 'asc' },
  });

  console.log('📋 Current sites in database:\n');
  allSites.forEach(site => {
    console.log(`   - ${site.siteName}`);
  });
  console.log('');

  // Fix "Gujarat" if it should be "Racecourse Vadodara Gujarat"
  const gujaratSite = await prisma.site.findFirst({
    where: { siteName: 'Gujarat' },
  });

  const racecourseSite = await prisma.site.findFirst({
    where: { siteName: { contains: 'Racecourse Vadodara', mode: 'insensitive' } },
  });

  if (gujaratSite && !racecourseSite) {
    console.log(`✏️  Renaming "Gujarat" → "Racecourse Vadodara Gujarat"`);
    await prisma.site.update({
      where: { id: gujaratSite.id },
      data: { siteName: 'Racecourse Vadodara Gujarat' },
    });
    console.log('   ✅ Fixed\n');
  } else if (racecourseSite && racecourseSite.siteName.includes('Gurjrat')) {
    console.log(`✏️  Fixing typo in "${racecourseSite.siteName}"`);
    await prisma.site.update({
      where: { id: racecourseSite.id },
      data: { siteName: 'Racecourse Vadodara Gujarat' },
    });
    console.log('   ✅ Fixed\n');
  }

  // Fix "Gandhinagar" if it should be "Suman City Gandhinagar"
  const gandhinagarSite = await prisma.site.findFirst({
    where: { siteName: 'Gandhinagar' },
  });

  const sumanSite = await prisma.site.findFirst({
    where: { siteName: { contains: 'Suman City', mode: 'insensitive' } },
  });

  if (gandhinagarSite && !sumanSite) {
    console.log(`✏️  Renaming "Gandhinagar" → "Suman City Gandhinagar"`);
    await prisma.site.update({
      where: { id: gandhinagarSite.id },
      data: { siteName: 'Suman City Gandhinagar' },
    });
    console.log('   ✅ Fixed\n');
  } else if (sumanSite && sumanSite.siteName.includes('Ghandhinagar')) {
    console.log(`✏️  Fixing typo in "${sumanSite.siteName}"`);
    await prisma.site.update({
      where: { id: sumanSite.id },
      data: { siteName: 'Suman City Gandhinagar' },
    });
    console.log('   ✅ Fixed\n');
  }

  // Fix any remaining "Gurjrat" -> "Gujarat" in site names
  const sitesWithGurjrat = await prisma.site.findMany({
    where: {
      siteName: {
        contains: 'Gurjrat',
        mode: 'insensitive',
      },
    },
  });

  for (const site of sitesWithGurjrat) {
    const fixedName = site.siteName.replace(/Gurjrat/gi, 'Gujarat');
    if (fixedName !== site.siteName) {
      console.log(`✏️  Fixing typo: "${site.siteName}" → "${fixedName}"`);
      await prisma.site.update({
        where: { id: site.id },
        data: { siteName: fixedName },
      });
      console.log('   ✅ Fixed\n');
    }
  }

  // Fix any remaining "Ghandhinagar" -> "Gandhinagar" in site names
  const sitesWithGhandhinagar = await prisma.site.findMany({
    where: {
      siteName: {
        contains: 'Ghandhinagar',
        mode: 'insensitive',
      },
    },
  });

  for (const site of sitesWithGhandhinagar) {
    const fixedName = site.siteName.replace(/Ghandhinagar/gi, 'Gandhinagar');
    if (fixedName !== site.siteName) {
      console.log(`✏️  Fixing typo: "${site.siteName}" → "${fixedName}"`);
      await prisma.site.update({
        where: { id: site.id },
        data: { siteName: fixedName },
      });
      console.log('   ✅ Fixed\n');
    }
  }

  console.log('✅ Site name fixes completed!\n');
}

fixSiteNames()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





