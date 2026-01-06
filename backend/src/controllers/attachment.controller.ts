import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import { upload } from '../middleware/upload.middleware';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util';
import fs from 'fs';
import path from 'path';

// Upload attachment
export const uploadAttachment = [
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const { caseId, caseType, description } = req.body;

      if (!caseId || !caseType) {
        // Delete uploaded file if validation fails
        if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 'caseId and caseType are required', 400);
      }

      // Verify case exists
      if (caseType === 'DTR') {
        const dtrCase = await prisma.dtrCase.findUnique({ where: { id: caseId } });
        if (!dtrCase) {
          if (req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return sendError(res, 'DTR case not found', 404);
        }
      } else if (caseType === 'RMA') {
        const rmaCase = await prisma.rmaCase.findUnique({ where: { id: caseId } });
        if (!rmaCase) {
          if (req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return sendError(res, 'RMA case not found', 404);
        }
      } else {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 'Invalid caseType. Must be DTR or RMA', 400);
      }

      // Determine file type
      let fileType: 'image' | 'log' | 'document' = 'document';
      const fileName = req.file.originalname.toLowerCase();
      const mimeType = req.file.mimetype.toLowerCase();

      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (fileName.endsWith('.zip') || fileName.endsWith('.log') || mimeType.includes('zip')) {
        fileType = 'log';
      }

      // Upload to Cloudinary
      let cloudinaryUrl: string | null = null;
      let cloudinaryPublicId: string | null = null;

      try {
        const folder = `${caseType.toLowerCase()}/${caseId}`;
        const cloudinaryResult = await uploadToCloudinary(req.file, folder, fileType);
        cloudinaryUrl = cloudinaryResult.secureUrl;
        cloudinaryPublicId = cloudinaryResult.publicId;

        // Optionally delete local file after Cloudinary upload
        if (req.file.path && fs.existsSync(req.file.path)) {
          // Keep local file as backup, or delete it:
          // fs.unlinkSync(req.file.path);
        }
      } catch (cloudinaryError: any) {
        console.error('Cloudinary upload failed, keeping local file:', {
          error: cloudinaryError.message || cloudinaryError,
          fileName: req.file.originalname,
          caseId,
          caseType,
          filePath: req.file.path,
        });
        // Continue with local file storage if Cloudinary fails
      }

            const attachment = await prisma.caseAttachment.create({
              data: {
                fileName: req.file.originalname,
                filePath: (req.file as any).path || undefined, // Keep for backward compatibility (disk storage)
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                caseId,
                caseType,
                description,
                uploadedBy: req.user!.userId,
                cloudinaryUrl: cloudinaryUrl || undefined,
                cloudinaryPublicId: cloudinaryPublicId || undefined,
                fileType: fileType || undefined,
              },
        include: {
          uploader: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return sendSuccess(res, { attachment }, 'File uploaded successfully');
    } catch (error: any) {
      // Clean up file if error occurs
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Upload attachment error:', error);
      return sendError(res, 'Failed to upload file', 500, error.message);
    }
  },
];

// Get attachments for a case
export async function getAttachments(req: AuthRequest, res: Response) {
  try {
    const { caseId, caseType } = req.query;

    if (!caseId || !caseType) {
      return sendError(res, 'caseId and caseType are required', 400);
    }

    const attachments = await prisma.caseAttachment.findMany({
      where: {
        caseId: caseId as string,
        caseType: caseType as string,
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, { attachments });
  } catch (error: any) {
    console.error('Get attachments error:', error);
    return sendError(res, 'Failed to fetch attachments', 500, error.message);
  }
}

// Download attachment
export async function downloadAttachment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const attachment = await prisma.caseAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return sendError(res, 'Attachment not found', 404);
    }

    // If Cloudinary URL exists, redirect to it
    if (attachment.cloudinaryUrl) {
      return res.redirect(attachment.cloudinaryUrl);
    }

    // Fallback to local file
    if (attachment.filePath && fs.existsSync(attachment.filePath)) {
      res.download(attachment.filePath, attachment.fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            return sendError(res, 'Failed to download file', 500);
          }
        }
      });
    } else {
      return sendError(res, 'File not found on server or Cloudinary', 404);
    }
  } catch (error: any) {
    console.error('Download attachment error:', error);
    return sendError(res, 'Failed to download file', 500, error.message);
  }
}

// Delete attachment
export async function deleteAttachment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const attachment = await prisma.caseAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return sendError(res, 'Attachment not found', 404);
    }

    // Check if user uploaded the file or has permission
    if (attachment.uploadedBy !== req.user!.userId) {
      // Check if user is admin or manager
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return sendError(res, 'You do not have permission to delete this attachment', 403);
      }
    }

    // Delete from Cloudinary if exists
    if (attachment.cloudinaryPublicId) {
      try {
        const resourceType = attachment.fileType === 'image' ? 'image' : 'raw';
        await deleteFromCloudinary(attachment.cloudinaryPublicId, resourceType);
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary delete fails
      }
    }

    // Delete file from disk (if local file exists)
    if (attachment.filePath && fs.existsSync(attachment.filePath)) {
      try {
        fs.unlinkSync(attachment.filePath);
      } catch (fsError) {
        console.error('Failed to delete local file:', fsError);
      }
    }

    await prisma.caseAttachment.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Attachment deleted successfully');
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    return sendError(res, 'Failed to delete attachment', 500, error.message);
  }
}

