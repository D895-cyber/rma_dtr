// Remove duplicate audis - keep one with more cases, move cases, then delete duplicates
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateAudis() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Remove Duplicate Audis                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Find the site
  const site = await prisma.site.findFirst({
    where: { siteName: 'Suman City Gandhinagar' },
    include: {
      audis: {
        include: {
          projector: {
            include: {
              projectorModel: true,
            },
          },
          rmaCases: true,
          dtrCases: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!site) {
    console.log('❌ Site "Suman City Gandhinagar" not found\n');
    return;
  }

  console.log(`📊 Site: "${site.siteName}"`);
  console.log(`   Total Audis: ${site.audis.length}\n`);

  // Group audis by audiNo and projectorId (same audi number + same projector = duplicate)
  const audiGroups = new Map<string, any[]>();

  site.audis.forEach(audi => {
    const key = `${audi.audiNo}_${audi.projectorId || 'no-projector'}`;
    if (!audiGroups.has(key)) {
      audiGroups.set(key, []);
    }
    audiGroups.get(key)!.push(audi);
  });

  // Find duplicates (groups with more than 1 audi)
  const duplicates = Array.from(audiGroups.entries())
    .filter(([_, audis]) => audis.length > 1);

  console.log(`📊 Duplicate audi groups found: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log('✅ No duplicate audis found!\n');
    return;
  }

  let totalDeleted = 0;
  let totalCasesMoved = 0;

  // Process each duplicate group
  for (const [key, audis] of duplicates) {
    const [audiNo, projectorId] = key.split('_');
    const projector = audis[0].projector;
    const model = projector?.projectorModel?.modelNo || 'N/A';
    const serial = projector?.serialNumber || 'N/A';

    console.log(`📝 Processing duplicates: Audi ${audiNo}, Model ${model}, Serial ${serial}`);
    console.log(`   Found ${audis.length} duplicate(s)\n`);

    // Count cases for each audi
    const audisWithCaseCount = audis.map(audi => ({
      audi,
      totalCases: audi.rmaCases.length + audi.dtrCases.length,
      rmaCount: audi.rmaCases.length,
      dtrCount: audi.dtrCases.length,
    }));

    // Sort by total cases (descending), then by creation date (ascending - keep oldest if tie)
    audisWithCaseCount.sort((a, b) => {
      if (b.totalCases !== a.totalCases) {
        return b.totalCases - a.totalCases;
      }
      return a.audi.createdAt.getTime() - b.audi.createdAt.getTime();
    });

    // The first one is the one to keep
    const audiToKeep = audisWithCaseCount[0].audi;
    const duplicatesToDelete = audisWithCaseCount.slice(1);

    console.log(`   ✅ Keeping: Audi ${audiToKeep.audiNo} (ID: ${audiToKeep.id})`);
    console.log(`      Cases: ${audiToKeep.rmaCases.length} RMA, ${audiToKeep.dtrCases.length} DTR\n`);

    // Process duplicates
    for (const { audi: duplicateAudi } of duplicatesToDelete) {
      console.log(`   🗑️  Processing duplicate: Audi ${duplicateAudi.audiNo} (ID: ${duplicateAudi.id})`);
      console.log(`      Cases: ${duplicateAudi.rmaCases.length} RMA, ${duplicateAudi.dtrCases.length} DTR`);

      // Move RMA cases
      if (duplicateAudi.rmaCases.length > 0) {
        await prisma.rmaCase.updateMany({
          where: { audiId: duplicateAudi.id },
          data: { audiId: audiToKeep.id },
        });
        console.log(`      ✅ Moved ${duplicateAudi.rmaCases.length} RMA case(s) to Audi ${audiToKeep.audiNo}`);
        totalCasesMoved += duplicateAudi.rmaCases.length;
      }

      // Move DTR cases
      if (duplicateAudi.dtrCases.length > 0) {
        await prisma.dtrCase.updateMany({
          where: { audiId: duplicateAudi.id },
          data: { audiId: audiToKeep.id },
        });
        console.log(`      ✅ Moved ${duplicateAudi.dtrCases.length} DTR case(s) to Audi ${audiToKeep.audiNo}`);
        totalCasesMoved += duplicateAudi.dtrCases.length;
      }

      // Delete the duplicate audi
      await prisma.audi.delete({
        where: { id: duplicateAudi.id },
      });
      console.log(`      ✅ Deleted duplicate Audi ${duplicateAudi.audiNo}\n`);
      totalDeleted++;
    }
  }

  // Verify final state
  const finalSite = await prisma.site.findUnique({
    where: { id: site.id },
    include: {
      audis: {
        include: {
          projector: {
            include: {
              projectorModel: true,
            },
          },
          rmaCases: true,
          dtrCases: true,
        },
        orderBy: {
          audiNo: 'asc',
        },
      },
    },
  });

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`Audis before: ${site.audis.length}`);
  console.log(`Audis deleted: ${totalDeleted}`);
  console.log(`Cases moved: ${totalCasesMoved}`);
  console.log(`Audis after: ${finalSite?.audis.length || 0}\n`);

  if (finalSite) {
    console.log('📊 Final audi list:');
    finalSite.audis.forEach(audi => {
      const model = audi.projector?.projectorModel?.modelNo || 'N/A';
      const serial = audi.projector?.serialNumber || 'N/A';
      console.log(`   Audi ${audi.audiNo}: Model ${model}, Serial ${serial}`);
      console.log(`      Cases: ${audi.rmaCases.length} RMA, ${audi.dtrCases.length} DTR`);
    });
  }

  console.log('\n✅ Duplicate removal complete!\n');
}

removeDuplicateAudis()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
