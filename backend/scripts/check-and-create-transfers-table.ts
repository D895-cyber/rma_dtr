import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndCreateTable() {
  try {
    // Try to query the table - if it doesn't exist, this will throw an error
    const count = await prisma.$queryRaw`SELECT COUNT(*) FROM projector_transfers`;
    console.log('✅ projector_transfers table exists!');
    console.log('Count:', count);
  } catch (error: any) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
      console.log('❌ projector_transfers table does not exist. Creating it...');
      
      // Create the table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "projector_transfers" (
          "id" TEXT NOT NULL,
          "projector_id" TEXT NOT NULL,
          "from_site_id" TEXT,
          "from_audi_id" TEXT,
          "to_site_id" TEXT NOT NULL,
          "to_audi_id" TEXT NOT NULL,
          "moved_by" TEXT,
          "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reason" TEXT,
          CONSTRAINT "projector_transfers_pkey" PRIMARY KEY ("id")
        )
      `;
      
      // Create index
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "projector_transfers_projector_id_moved_at_idx" 
        ON "projector_transfers"("projector_id", "moved_at")
      `;
      
      // Add foreign key
      await prisma.$executeRaw`
        ALTER TABLE "projector_transfers" 
        ADD CONSTRAINT IF NOT EXISTS "projector_transfers_projector_id_fkey" 
        FOREIGN KEY ("projector_id") REFERENCES "projectors"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      console.log('✅ projector_transfers table created successfully!');
    } else {
      console.error('Error checking table:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateTable();





