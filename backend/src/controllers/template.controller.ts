import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

// Get all templates
export async function getTemplates(req: AuthRequest, res: Response) {
  try {
    const { caseType } = req.query;

    const templates = await prisma.caseTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdBy: req.user!.userId },
        ],
        ...(caseType && { caseType: caseType as string }),
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return sendSuccess(res, { templates });
  } catch (error: any) {
    console.error('Get templates error:', error);
    return sendError(res, 'Failed to fetch templates', 500, error.message);
  }
}

// Get single template by ID
export async function getTemplateById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const template = await prisma.caseTemplate.findFirst({
      where: {
        id,
        OR: [
          { isPublic: true },
          { createdBy: req.user!.userId },
        ],
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!template) {
      return sendError(res, 'Template not found', 404);
    }

    return sendSuccess(res, { template });
  } catch (error: any) {
    console.error('Get template error:', error);
    return sendError(res, 'Failed to fetch template', 500, error.message);
  }
}

// Create template
export async function createTemplate(req: AuthRequest, res: Response) {
  try {
    const { name, description, caseType, templateData, isPublic } = req.body;

    if (!name || !caseType || !templateData) {
      return sendError(res, 'Name, caseType, and templateData are required', 400);
    }

    const template = await prisma.caseTemplate.create({
      data: {
        name,
        description,
        caseType,
        templateData,
        isPublic: isPublic ?? false,
        createdBy: req.user!.userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return sendSuccess(res, { template }, 'Template created successfully');
  } catch (error: any) {
    console.error('Create template error:', error);
    return sendError(res, 'Failed to create template', 500, error.message);
  }
}

// Update template
export async function updateTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, templateData, isPublic } = req.body;

    // Check if user owns the template
    const existingTemplate = await prisma.caseTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return sendError(res, 'Template not found', 404);
    }

    if (existingTemplate.createdBy !== req.user!.userId) {
      return sendError(res, 'You do not have permission to update this template', 403);
    }

    const template = await prisma.caseTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(templateData && { templateData }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return sendSuccess(res, { template }, 'Template updated successfully');
  } catch (error: any) {
    console.error('Update template error:', error);
    return sendError(res, 'Failed to update template', 500, error.message);
  }
}

// Use template (increment usage count)
export async function useTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const template = await prisma.caseTemplate.findFirst({
      where: {
        id,
        OR: [
          { isPublic: true },
          { createdBy: req.user!.userId },
        ],
      },
    });

    if (!template) {
      return sendError(res, 'Template not found', 404);
    }

    // Increment usage count
    await prisma.caseTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return sendSuccess(res, { template }, 'Template used successfully');
  } catch (error: any) {
    console.error('Use template error:', error);
    return sendError(res, 'Failed to use template', 500, error.message);
  }
}

// Delete template
export async function deleteTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const template = await prisma.caseTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return sendError(res, 'Template not found', 404);
    }

    if (template.createdBy !== req.user!.userId) {
      return sendError(res, 'You do not have permission to delete this template', 403);
    }

    await prisma.caseTemplate.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Template deleted successfully');
  } catch (error: any) {
    console.error('Delete template error:', error);
    return sendError(res, 'Failed to delete template', 500, error.message);
  }
}

