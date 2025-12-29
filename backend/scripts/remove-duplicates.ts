// Remove duplicate sites, keeping only the first occurrence of each site name

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateSites() {
  try {
    console.log('🔍 Finding duplicate sites...\n');
    
    // Get all sites
    const allSites = await prisma.site.findMany({
      orderBy: { createdAt: 'asc' }, // Keep the oldest (first created)
    });
    
    const seen = new Set<string>();
    const toDelete: string[] = [];
    
    for (const site of allSites) {
      if (seen.has(site.siteName)) {
        // This is a duplicate, mark for deletion
        toDelete.push(site.id);
      } else {
        // First occurrence, keep it
        seen.add(site.siteName);
      }
    }
    
    console.log(`📊 Found ${allSites.length} total sites`);
    console.log(`📋 Unique site names: ${seen.size}`);
    console.log(`🗑️  Duplicates to remove: ${toDelete.length}\n`);
    
    if (toDelete.length > 0) {
      // Delete duplicates
      const result = await prisma.site.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });
      
      console.log(`✅ Removed ${result.count} duplicate sites`);
      console.log(`✅ Kept ${seen.size} unique sites\n`);
    } else {
      console.log('✅ No duplicates found!\n');
    }
    
    // Verify final count
    const finalCount = await prisma.site.count();
    console.log(`📊 Final site count: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicateSites()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });








