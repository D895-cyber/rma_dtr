import { PrismaClient } from '@prisma/client';
import { deleteFromCloudinary } from '../src/utils/cloudinary.util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

interface DeleteOptions {
  caseId?: string;
  caseType?: 'DTR' | 'RMA';
  fileName?: string;
  dryRun?: boolean;
  deleteAll?: boolean;
}

async function deleteAttachments(options: DeleteOptions = {}) {
  try {
    const { caseId, caseType, fileName, dryRun = false, deleteAll = false } = options;

    // Build where clause
    const where: any = {};
    
    if (caseId) {
      where.caseId = caseId;
    }
    
    if (caseType) {
      where.caseType = caseType;
    }
    
    if (fileName) {
      where.fileName = { contains: fileName, mode: 'insensitive' };
    }

    // Find attachments
    const attachments = await prisma.caseAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to prevent too many results
    });
    
    // If no caseId specified, show all attachments
    if (!caseId && !fileName && !caseType && !deleteAll) {
      console.log('\n⚠️  No filters specified. Showing recent attachments:');
      const recentAttachments = await prisma.caseAttachment.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: { name: true, email: true },
          },
        },
      });
      
      if (recentAttachments.length > 0) {
        console.log(`\nFound ${recentAttachments.length} recent attachments:\n`);
        recentAttachments.forEach((att, index) => {
          console.log(`${index + 1}. ${att.fileName}`);
          console.log(`   Case: ${att.caseType} - ${att.caseId}`);
          console.log(`   Uploaded by: ${att.uploader?.name || 'Unknown'}`);
          console.log(`   Date: ${att.createdAt.toLocaleString()}`);
          console.log('');
        });
        console.log('💡 Tip: Use --case-id <id> to delete attachments for a specific case');
        console.log('💡 Tip: Use --file-name <name> to delete files with specific name pattern');
        return;
      }
    }

    if (attachments.length === 0) {
      console.log('❌ No attachments found matching the criteria.');
      return;
    }

    console.log(`\n📋 Found ${attachments.length} attachment(s) to delete:\n`);
    
    // Display attachments
    attachments.forEach((att, index) => {
      console.log(`${index + 1}. ${att.fileName}`);
      console.log(`   Case: ${att.caseType} - ${att.caseId}`);
      console.log(`   Size: ${(att.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   Type: ${att.fileType || 'unknown'}`);
      console.log(`   Cloudinary: ${att.cloudinaryPublicId ? '✅ Yes' : '❌ No'}`);
      console.log(`   Local: ${att.filePath ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 DRY RUN - No files were deleted.');
      return;
    }

    // Confirm deletion
    if (!deleteAll) {
      console.log('⚠️  This will delete the files from:');
      console.log('   - Cloudinary (if uploaded)');
      console.log('   - Local disk (if exists)');
      console.log('   - Database');
      console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    let deletedCount = 0;
    let cloudinaryDeleted = 0;
    let localDeleted = 0;
    let errors = 0;

    // Delete each attachment
    for (const attachment of attachments) {
      try {
        console.log(`🗑️  Deleting: ${attachment.fileName}...`);

        // Delete from Cloudinary
        if (attachment.cloudinaryPublicId) {
          try {
            const resourceType = attachment.fileType === 'image' ? 'image' : 'raw';
            await deleteFromCloudinary(attachment.cloudinaryPublicId, resourceType);
            cloudinaryDeleted++;
            console.log(`   ✅ Deleted from Cloudinary`);
          } catch (cloudinaryError: any) {
            console.log(`   ⚠️  Cloudinary delete failed: ${cloudinaryError.message}`);
          }
        }

        // Delete local file
        if (attachment.filePath && fs.existsSync(attachment.filePath)) {
          try {
            fs.unlinkSync(attachment.filePath);
            localDeleted++;
            console.log(`   ✅ Deleted local file`);
          } catch (fsError: any) {
            console.log(`   ⚠️  Local file delete failed: ${fsError.message}`);
          }
        }

        // Delete from database
        await prisma.caseAttachment.delete({
          where: { id: attachment.id },
        });
        deletedCount++;
        console.log(`   ✅ Deleted from database\n`);

      } catch (error: any) {
        errors++;
        console.error(`   ❌ Error deleting ${attachment.fileName}: ${error.message}\n`);
      }
    }

    // Summary
    console.log('\n📊 Deletion Summary:');
    console.log(`   Total found: ${attachments.length}`);
    console.log(`   ✅ Deleted from database: ${deletedCount}`);
    console.log(`   ✅ Deleted from Cloudinary: ${cloudinaryDeleted}`);
    console.log(`   ✅ Deleted local files: ${localDeleted}`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: DeleteOptions = {
  dryRun: args.includes('--dry-run'),
  deleteAll: args.includes('--all'),
};

// Parse caseId
const caseIdIndex = args.indexOf('--case-id');
if (caseIdIndex !== -1 && args[caseIdIndex + 1]) {
  options.caseId = args[caseIdIndex + 1];
}

// Parse caseType
const caseTypeIndex = args.indexOf('--case-type');
if (caseTypeIndex !== -1 && args[caseTypeIndex + 1]) {
  options.caseType = args[caseTypeIndex + 1].toUpperCase() as 'DTR' | 'RMA';
}

// Parse fileName
const fileNameIndex = args.indexOf('--file-name');
if (fileNameIndex !== -1 && args[fileNameIndex + 1]) {
  options.fileName = args[fileNameIndex + 1];
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🗑️  Delete Test Attachments Script

Usage:
  npm run delete:attachments [options]

Options:
  --case-id <id>        Delete attachments for specific case ID
  --case-type <type>    Filter by case type (DTR or RMA)
  --file-name <name>    Filter by file name (partial match)
  --dry-run            Show what would be deleted without deleting
  --all                Delete all matching attachments without confirmation
  --help, -h           Show this help message

Examples:
  # Preview what would be deleted for case 7065921
  npm run delete:attachments --case-id 7065921 --dry-run

  # Delete all attachments for case 7065921
  npm run delete:attachments --case-id 7065921

  # Delete all test files (files with "test" in name)
  npm run delete:attachments --file-name test

  # Delete all RMA attachments
  npm run delete:attachments --case-type RMA --dry-run

  # Delete all attachments (use with caution!)
  npm run delete:attachments --all
`);
  process.exit(0);
}

// Run the script
deleteAttachments(options).catch(console.error);

