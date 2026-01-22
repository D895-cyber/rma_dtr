// Check for duplicate sites
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateSites() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Check for Duplicate Sites                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Get all sites
  const allSites = await prisma.site.findMany({
    include: {
      audis: {
        include: {
          projector: {
            include: {
              projectorModel: true,
            },
          },
        },
      },
    },
    orderBy: {
      siteName: 'asc',
    },
  });

  console.log(`📊 Total sites in database: ${allSites.length}\n`);

  // Find duplicates by site name
  const siteNameMap = new Map<string, any[]>();

  allSites.forEach(site => {
    const name = site.siteName.trim();
    if (!siteNameMap.has(name)) {
      siteNameMap.set(name, []);
    }
    siteNameMap.get(name)!.push(site);
  });

  // Find duplicates
  const duplicates = Array.from(siteNameMap.entries())
    .filter(([_, sites]) => sites.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`📊 Duplicate site names found: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate sites found!\n');
    return;
  }

  // Show duplicates
  for (const [siteName, sites] of duplicates) {
    console.log(`⚠️  Site: "${siteName}" - appears ${sites.length} times:`);
    
    sites.forEach((site, index) => {
      console.log(`\n   ${index + 1}. Site ID: ${site.id}`);
      console.log(`      Created: ${site.createdAt.toISOString()}`);
      console.log(`      Audis: ${site.audis.length}`);
      
      if (site.audis.length > 0) {
        console.log(`      Audi details:`);
        site.audis.forEach((audi: any, audiIndex: number) => {
          const model = audi.projector?.projectorModel?.modelNo || 'N/A';
          const serial = audi.projector?.serialNumber || 'N/A';
          console.log(`         ${audiIndex + 1}. Audi ${audi.audiNo} - Model: ${model}, Serial: ${serial}`);
        });
      }
    });
    console.log('');
  }

  // Check for "Suman City Gandhinagar" specifically
  const sumanCity = allSites.filter(s => s.siteName.includes('Suman City Gandhinagar'));
  if (sumanCity.length > 1) {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║         Suman City Gandhinagar Details                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    
    sumanCity.forEach((site, index) => {
      console.log(`Instance ${index + 1}:`);
      console.log(`   ID: ${site.id}`);
      console.log(`   Name: "${site.siteName}"`);
      console.log(`   Audis: ${site.audis.length}`);
      site.audis.forEach(audi => {
        const model = audi.projector?.projectorModel?.modelNo || 'N/A';
        const serial = audi.projector?.serialNumber || 'N/A';
        console.log(`      - Audi ${audi.audiNo}: Model ${model}, Serial ${serial}`);
      });
      console.log('');
    });
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const totalDuplicateSites = duplicates.reduce((sum, [_, sites]) => sum + sites.length, 0);
  const uniqueSiteNames = siteNameMap.size;
  const extraSites = totalDuplicateSites - uniqueSiteNames;

  console.log(`Unique site names: ${uniqueSiteNames}`);
  console.log(`Total site records: ${allSites.length}`);
  console.log(`Extra duplicate records: ${extraSites}\n`);

  if (duplicates.length > 0) {
    console.log('⚠️  Recommendation:');
    console.log('   - Merge duplicate sites by moving all audis to one site');
    console.log('   - Delete the duplicate site records\n');
  }
}

checkDuplicateSites()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
