import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
  try {
    const siteCount = await prisma.site.count();
    console.log(`📊 Total sites in database: ${siteCount}`);
    
    // Check for duplicates
    const sites = await prisma.site.findMany({
      select: { siteName: true },
      orderBy: { siteName: 'asc' },
    });
    
    const siteNames = sites.map(s => s.siteName);
    const uniqueSiteNames = new Set(siteNames);
    
    console.log(`\n📋 Analysis:`);
    console.log(`   Total records: ${siteCount}`);
    console.log(`   Unique site names: ${uniqueSiteNames.size}`);
    
    if (siteCount !== uniqueSiteNames.size) {
      console.log(`\n⚠️  Found ${siteCount - uniqueSiteNames.size} duplicate site names!`);
      
      // Find duplicates
      const duplicates: string[] = [];
      const seen = new Set<string>();
      
      siteNames.forEach(name => {
        if (seen.has(name)) {
          if (!duplicates.includes(name)) {
            duplicates.push(name);
          }
        } else {
          seen.add(name);
        }
      });
      
      console.log(`\n🔍 Duplicate site names:`);
      duplicates.forEach(name => {
        const count = siteNames.filter(n => n === name).length;
        console.log(`   "${name}" appears ${count} times`);
      });
    } else {
      console.log(`\n✅ No duplicates found!`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCounts();



