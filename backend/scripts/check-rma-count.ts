// Check RMA case count and identify discrepancies
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRmaCount() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              RMA Cases Count Analysis                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Total count
  const totalCount = await prisma.rmaCase.count();
  console.log(`📊 Total RMA Cases in Database: ${totalCount}\n`);

  // Count by status
  const statusCounts = await prisma.rmaCase.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('📊 Count by Status:');
  statusCounts.forEach(({ status, _count }) => {
    console.log(`   ${status}: ${_count}`);
  });
  console.log('');

  // Check for duplicate callLogNumbers
  const duplicateCallLogs = await prisma.$queryRaw<Array<{ callLogNumber: string; count: bigint }>>`
    SELECT "call_log_number", COUNT(*) as count
    FROM rma_cases
    WHERE "call_log_number" IS NOT NULL
    GROUP BY "call_log_number"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  if (duplicateCallLogs.length > 0) {
    console.log(`⚠️  Found ${duplicateCallLogs.length} duplicate callLogNumbers:`);
    duplicateCallLogs.slice(0, 10).forEach(({ callLogNumber, count }) => {
      console.log(`   ${callLogNumber}: ${count} occurrences`);
    });
    if (duplicateCallLogs.length > 10) {
      console.log(`   ... and ${duplicateCallLogs.length - 10} more`);
    }
    console.log('');
  } else {
    console.log('✅ No duplicate callLogNumbers found\n');
  }

  // Check for duplicate rmaNumbers
  const duplicateRmaNumbers = await prisma.$queryRaw<Array<{ rmaNumber: string; count: bigint }>>`
    SELECT "rma_number", COUNT(*) as count
    FROM rma_cases
    WHERE "rma_number" IS NOT NULL
    GROUP BY "rma_number"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  if (duplicateRmaNumbers.length > 0) {
    console.log(`⚠️  Found ${duplicateRmaNumbers.length} duplicate rmaNumbers:`);
    duplicateRmaNumbers.slice(0, 10).forEach(({ rmaNumber, count }) => {
      console.log(`   ${rmaNumber}: ${count} occurrences`);
    });
    if (duplicateRmaNumbers.length > 10) {
      console.log(`   ... and ${duplicateRmaNumbers.length - 10} more`);
    }
    console.log('');
  } else {
    console.log('✅ No duplicate rmaNumbers found\n');
  }

  // Check cases created today (after import)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recentCases = await prisma.rmaCase.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  console.log(`📅 Cases created today (after import): ${recentCases}\n`);

  // Check cases with suffixes (from duplicate handling)
  const casesWithSuffixes = await prisma.rmaCase.findMany({
    where: {
      OR: [
        { callLogNumber: { contains: '-' } },
        { rmaNumber: { contains: '-' } },
      ],
    },
    select: {
      id: true,
      callLogNumber: true,
      rmaNumber: true,
    },
    take: 20,
  });

  if (casesWithSuffixes.length > 0) {
    console.log(`📝 Sample cases with suffixes (duplicate handling):`);
    casesWithSuffixes.slice(0, 10).forEach(c => {
      console.log(`   CallLog: ${c.callLogNumber || 'N/A'}, RMA: ${c.rmaNumber || 'N/A'}`);
    });
    console.log('');
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Summary                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Expected: 824 cases (from import)`);
  console.log(`Actual: ${totalCount} cases in database`);
  console.log(`Difference: ${totalCount - 824} cases\n`);

  if (totalCount > 824) {
    console.log('⚠️  There are more cases than expected. Possible reasons:');
    console.log('   1. Some cases were created through the UI');
    console.log('   2. Duplicate handling created additional cases');
    console.log('   3. Previous import left some cases');
    console.log('');
  } else if (totalCount < 824) {
    console.log('⚠️  There are fewer cases than expected. Some imports may have failed.');
    console.log('');
  } else {
    console.log('✅ Count matches expected import!\n');
  }
}

checkRmaCount()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
