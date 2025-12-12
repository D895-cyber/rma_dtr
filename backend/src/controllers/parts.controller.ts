import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { prisma } from '../utils/prisma.util';

// Get all parts
export async function getAllParts(req: Request, res: Response) {
  try {
    const parts = await prisma.part.findMany({
      include: {
        projectorModel: {
          select: {
            id: true,
            modelNo: true,
            manufacturer: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sendSuccess(res, { parts, total: parts.length });
  } catch (error: any) {
    console.error('Get all parts error:', error);
    return sendError(res, 'Failed to fetch parts', 500, error.message);
  }
}

// Get parts by projector model number
export async function getPartsByProjectorModel(req: Request, res: Response) {
  try {
    const { modelNo } = req.params;

    // First find the projector model
    const projectorModel = await prisma.projectorModel.findUnique({
      where: { modelNo },
    });

    if (!projectorModel) {
      return sendError(res, 'Projector model not found', 404);
    }

    const parts = await prisma.part.findMany({
      where: {
        projectorModelId: projectorModel.id,
      },
      include: {
        projectorModel: {
          select: {
            id: true,
            modelNo: true,
            manufacturer: true,
          },
        },
      },
      orderBy: {
        category: 'asc',
      },
    });

    return sendSuccess(res, { parts, total: parts.length });
  } catch (error: any) {
    console.error('Get parts by model error:', error);
    return sendError(res, 'Failed to fetch parts for projector model', 500, error.message);
  }
}

// Get single part by ID
export async function getPartById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        projectorModel: true,
      },
    });

    if (!part) {
      return sendError(res, 'Part not found', 404);
    }

    return sendSuccess(res, { part });
  } catch (error: any) {
    console.error('Get part by ID error:', error);
    return sendError(res, 'Failed to fetch part', 500, error.message);
  }
}

// Create part
export async function createPart(req: Request, res: Response) {
  try {
    const { partName, partNumber, projectorModelId, category, description } = req.body;

    // Validation
    if (!partName || !partNumber || !projectorModelId) {
      return sendError(res, 'Part name, part number, and projector model ID are required', 400);
    }

    // Check if projector model exists
    const projectorModel = await prisma.projectorModel.findUnique({
      where: { id: projectorModelId },
    });

    if (!projectorModel) {
      return sendError(res, 'Projector model not found', 404);
    }

    // Create part
    const part = await prisma.part.create({
      data: {
        partName,
        partNumber,
        projectorModelId,
        category: category || null,
        description: description || null,
      },
      include: {
        projectorModel: true,
      },
    });

    return sendSuccess(res, { part }, 'Part created successfully', 201);
  } catch (error: any) {
    console.error('Create part error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return sendError(
        res,
        'Part with this part number already exists for this projector model',
        400
      );
    }
    
    return sendError(res, 'Failed to create part', 500, error.message);
  }
}

// Update part
export async function updatePart(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { partName, partNumber, category, description } = req.body;

    // Build update data
    const updateData: any = {};
    if (partName !== undefined) updateData.partName = partName;
    if (partNumber !== undefined) updateData.partNumber = partNumber;
    if (category !== undefined) updateData.category = category || null;
    if (description !== undefined) updateData.description = description || null;

    const part = await prisma.part.update({
      where: { id },
      data: updateData,
      include: {
        projectorModel: true,
      },
    });

    return sendSuccess(res, { part }, 'Part updated successfully');
  } catch (error: any) {
    console.error('Update part error:', error);
    
    if (error.code === 'P2025') {
      return sendError(res, 'Part not found', 404);
    }
    
    if (error.code === 'P2002') {
      return sendError(
        res,
        'Part with this part number already exists for this projector model',
        400
      );
    }
    
    return sendError(res, 'Failed to update part', 500, error.message);
  }
}

// Delete part
export async function deletePart(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.part.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Part deleted successfully');
  } catch (error: any) {
    console.error('Delete part error:', error);
    
    if (error.code === 'P2025') {
      return sendError(res, 'Part not found', 404);
    }
    
    return sendError(res, 'Failed to delete part', 500, error.message);
  }
}

// Get part categories (distinct list)
export async function getPartCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.part.findMany({
      where: {
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    const categoryList = categories
      .map((c) => c.category)
      .filter((c): c is string => c !== null)
      .sort();

    return sendSuccess(res, { categories: categoryList });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return sendError(res, 'Failed to fetch categories', 500, error.message);
  }
}

