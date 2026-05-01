// Remove duplicate DTR cases with suffixes (e.g. 240201-1, 240201-2) when the base case (240201) exists
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUFFIX_REGEX = /-\d+$/;

function stripSuffix(value: string): string {
  return value.replace(SUFFIX_REGEX, '') || value;
}

function hasSuffix(value: string): boolean {
  return /-\d+$/.test(String(value));
}

const dryRun = process.argv.includes('--dry-run');

async function removeDuplicateDTRCases() {
  process.stdout.write('╔══════════════════════════════════════════════════════════════════╗\n');
  process.stdout.write('║         Remove Duplicate DTR Cases (suffix -1, -2, etc.)          ║\n');
  process.stdout.write('╚══════════════════════════════════════════════════════════════════╝\n\n');

  const allCases = await prisma.dtrCase.findMany({
    select: { id: true, caseNumber: true },
  });

  const suffixedCases = allCases.filter((c) => hasSuffix(c.caseNumber));
  const baseCaseNumbers = new Set(
    allCases.filter((c) => !hasSuffix(c.caseNumber)).map((c) => c.caseNumber)
  );

  const toDelete: Array<{ id: string; caseNumber: string; baseNumber: string }> = [];

  for (const c of suffixedCases) {
    const base = stripSuffix(c.caseNumber);
    if (baseCaseNumbers.has(base)) {
      toDelete.push({ id: c.id, caseNumber: c.caseNumber, baseNumber: base });
    }
  }

  process.stdout.write(`📊 DTR cases with suffix (-1, -2, etc.): ${suffixedCases.length}\n`);
  process.stdout.write(`   Duplicates to remove (base exists): ${toDelete.length}\n\n`);

  if (toDelete.length === 0) {
    process.stdout.write('✅ No duplicate DTR cases to remove.\n\n');
    return;
  }

  if (dryRun) {
    process.stdout.write('🔍 DRY RUN - would delete:\n');
    toDelete.slice(0, 20).forEach((d) => process.stdout.write(`   ${d.caseNumber} (keep ${d.baseNumber})\n`));
    if (toDelete.length > 20) process.stdout.write(`   ... and ${toDelete.length - 20} more\n`);
    process.stdout.write('\nRun without --dry-run to actually delete.\n\n');
    return;
  }

  const ids = toDelete.map((d) => d.id);
  const result = await prisma.dtrCase.deleteMany({ where: { id: { in: ids } } });
  process.stdout.write(`✅ Removed ${result.count} duplicate DTR case(s).\n\n`);
}

removeDuplicateDTRCases()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
