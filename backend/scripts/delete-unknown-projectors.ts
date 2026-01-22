// Delete projectors with serial numbers 549779002 and 558583016
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serialNumbersToDelete = ['549779002', '558583016'];

async function deleteProjectors() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Delete UNKNOWN Projectors                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  for (const serialNumber of serialNumbersToDelete) {
    console.log(`📝 Checking projector: ${serialNumber}`);

    const projector = await prisma.projector.findUnique({
      where: { serialNumber },
      include: {
        projectorModel: true,
        audis: {
          include: {
            rmaCases: true,
            dtrCases: true,
          },
        },
      },
    });

    if (!projector) {
      console.log(`   ⚠️  Projector not found\n`);
      continue;
    }

    console.log(`   Model: ${projector.projectorModel?.modelNo || 'N/A'}`);
    console.log(`   Audis: ${projector.audis.length}`);

    // Check for RMA cases
    const rmaCases = await prisma.rmaCase.findMany({
      where: { serialNumber },
      select: {
        id: true,
        rmaNumber: true,
        callLogNumber: true,
      },
    });

    console.log(`   RMA Cases: ${rmaCases.length}`);

    // Check for DTR cases (via audis)
    let totalDtrCases = 0;
    for (const audi of projector.audis) {
      totalDtrCases += audi.dtrCases.length;
    }
    console.log(`   DTR Cases: ${totalDtrCases}\n`);

    if (rmaCases.length > 0 || totalDtrCases > 0 || projector.audis.length > 0) {
      console.log(`   ⚠️  This projector has dependencies:`);
      if (rmaCases.length > 0) {
        console.log(`      - ${rmaCases.length} RMA case(s)`);
        rmaCases.forEach(rma => {
          const identifier = rma.rmaNumber || rma.callLogNumber || rma.id;
          console.log(`        * RMA ${identifier}`);
        });
      }
      if (projector.audis.length > 0) {
        console.log(`      - ${projector.audis.length} Audi(s)`);
        projector.audis.forEach(audi => {
          console.log(`        * Audi ${audi.audiNo} (${audi.dtrCases.length} DTR cases)`);
        });
      }
      console.log('');

      // Delete RMA cases first
      if (rmaCases.length > 0) {
        console.log(`   🗑️  Deleting ${rmaCases.length} RMA case(s)...`);
        
        // Delete audit logs
        const auditLogsDeleted = await prisma.auditLog.deleteMany({
          where: {
            caseId: { in: rmaCases.map(c => c.id) },
            caseType: 'RMA',
          },
        });
        console.log(`      ✅ Deleted ${auditLogsDeleted.count} audit log(s)`);

        // Delete RMA cases
        const rmaDeleted = await prisma.rmaCase.deleteMany({
          where: {
            serialNumber,
          },
        });
        console.log(`      ✅ Deleted ${rmaDeleted.count} RMA case(s)\n`);
      }

      // Delete DTR cases
      if (totalDtrCases > 0) {
        console.log(`   🗑️  Deleting ${totalDtrCases} DTR case(s)...`);
        
        for (const audi of projector.audis) {
          if (audi.dtrCases.length > 0) {
            const dtrIds = audi.dtrCases.map(c => c.id);
            
            // Delete audit logs
            await prisma.auditLog.deleteMany({
              where: {
                caseId: { in: dtrIds },
                caseType: 'DTR',
              },
            });

            // Delete DTR cases
            await prisma.dtrCase.deleteMany({
              where: {
                audiId: audi.id,
              },
            });
          }
        }
        console.log(`      ✅ Deleted ${totalDtrCases} DTR case(s)\n`);
      }

      // Delete Audis
      if (projector.audis.length > 0) {
        console.log(`   🗑️  Deleting ${projector.audis.length} Audi(s)...`);
        const audisDeleted = await prisma.audi.deleteMany({
          where: {
            projectorId: projector.id,
          },
        });
        console.log(`      ✅ Deleted ${audisDeleted.count} Audi(s)\n`);
      }
    }

    // Delete the projector
    console.log(`   🗑️  Deleting projector...`);
    await prisma.projector.delete({
      where: { serialNumber },
    });
    console.log(`   ✅ Deleted projector: ${serialNumber}\n`);
  }

  // Verify deletion
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         Verification                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  for (const serialNumber of serialNumbersToDelete) {
    const projector = await prisma.projector.findUnique({
      where: { serialNumber },
    });

    if (projector) {
      console.log(`❌ Serial ${serialNumber}: Still exists`);
    } else {
      console.log(`✅ Serial ${serialNumber}: Successfully deleted`);
    }

    const rmaCases = await prisma.rmaCase.count({
      where: { serialNumber },
    });

    if (rmaCases > 0) {
      console.log(`   ⚠️  ${rmaCases} RMA case(s) still exist`);
    } else {
      console.log(`   ✅ No RMA cases remaining`);
    }
  }

  console.log('\n✅ Deletion complete!\n');
}

deleteProjectors()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
