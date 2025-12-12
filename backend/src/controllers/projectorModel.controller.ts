import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { prisma } from '../utils/prisma.util';

// Get all projector models
export async function getAllProjectorModels(req: Request, res: Response) {
  try {
    const models = await prisma.projectorModel.findMany({
      include: {
        _count: {
          select: {
            projectors: true,
            parts: true,
          },
        },
      },
      orderBy: {
        modelNo: 'asc',
      },
    });

    return sendSuccess(res, { models, total: models.length });
  } catch (error: any) {
    console.error('Get all projector models error:', error);
    return sendError(res, 'Failed to fetch projector models', 500, error.message);
  }
}

// Get single projector model
export async function getProjectorModelById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const model = await prisma.projectorModel.findUnique({
      where: { id },
      include: {
        projectors: {
          include: {
            audis: {
              include: {
                site: true,
              },
            },
          },
        },
        parts: true,
        _count: {
          select: {
            projectors: true,
            parts: true,
          },
        },
      },
    });

    if (!model) {
      return sendError(res, 'Projector model not found', 404);
    }

    return sendSuccess(res, { model });
  } catch (error: any) {
    console.error('Get projector model error:', error);
    return sendError(res, 'Failed to fetch projector model', 500, error.message);
  }
}

// Get projector model by modelNo
export async function getProjectorModelByModelNo(req: Request, res: Response) {
  try {
    const { modelNo } = req.params;

    const model = await prisma.projectorModel.findUnique({
      where: { modelNo },
      include: {
        projectors: {
          include: {
            audis: {
              include: {
                site: true,
              },
            },
          },
        },
        parts: true,
      },
    });

    if (!model) {
      return sendError(res, 'Projector model not found', 404);
    }

    return sendSuccess(res, { model });
  } catch (error: any) {
    console.error('Get projector model by modelNo error:', error);
    return sendError(res, 'Failed to fetch projector model', 500, error.message);
  }
}

// Create projector model
export async function createProjectorModel(req: Request, res: Response) {
  try {
    const { modelNo, manufacturer, specifications } = req.body;

    if (!modelNo) {
      return sendError(res, 'Model number is required', 400);
    }

    const model = await prisma.projectorModel.create({
      data: {
        modelNo,
        manufacturer: manufacturer || null,
        specifications: specifications || null,
      },
    });

    return sendSuccess(res, { model }, 'Projector model created successfully', 201);
  } catch (error: any) {
    console.error('Create projector model error:', error);

    if (error.code === 'P2002') {
      return sendError(res, 'Projector model with this model number already exists', 400);
    }

    return sendError(res, 'Failed to create projector model', 500, error.message);
  }
}

// Update projector model
export async function updateProjectorModel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { modelNo, manufacturer, specifications } = req.body;

    const updateData: any = {};
    if (modelNo !== undefined) updateData.modelNo = modelNo;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer || null;
    if (specifications !== undefined) updateData.specifications = specifications || null;

    const model = await prisma.projectorModel.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(res, { model }, 'Projector model updated successfully');
  } catch (error: any) {
    console.error('Update projector model error:', error);

    if (error.code === 'P2025') {
      return sendError(res, 'Projector model not found', 404);
    }

    if (error.code === 'P2002') {
      return sendError(res, 'Projector model with this model number already exists', 400);
    }

    return sendError(res, 'Failed to update projector model', 500, error.message);
  }
}

// Delete projector model
export async function deleteProjectorModel(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if any projectors use this model
    const count = await prisma.projector.count({
      where: { projectorModelId: id },
    });

    if (count > 0) {
      return sendError(
        res,
        `Cannot delete model: ${count} projector(s) are using this model`,
        400
      );
    }

    await prisma.projectorModel.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Projector model deleted successfully');
  } catch (error: any) {
    console.error('Delete projector model error:', error);

    if (error.code === 'P2025') {
      return sendError(res, 'Projector model not found', 404);
    }

    return sendError(res, 'Failed to delete projector model', 500, error.message);
  }
}



