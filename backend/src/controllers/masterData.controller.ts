import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { prisma } from '../utils/prisma.util';
import { AuthRequest } from '../middleware/auth.middleware';

// ============================================
// SITE CONTROLLERS
// ============================================

export async function getAllSites(req: AuthRequest, res: Response) {
  try {
    const { search } = req.query;

    const where: any = {};

    if (search) {
      where.siteName = { contains: search as string, mode: 'insensitive' };
    }

    // Staff: restrict to PVR sites only
    if (req.user?.role === 'staff') {
      where.siteType = 'pvr';
    }

    const sites = await prisma.site.findMany({
      where,
      include: {
        audis: {
          include: {
            projector: {
              include: {
                projectorModel: true,
              },
            },
          },
        },
      },
      orderBy: { siteName: 'asc' },
    });

    return sendSuccess(res, { sites });
  } catch (error: any) {
    console.error('Get sites error:', error);
    return sendError(res, 'Failed to fetch sites', 500, error.message);
  }
}

export async function getSiteById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        audis: {
          include: {
            projector: {
              include: {
                projectorModel: true,
              },
            },
          },
        },
      },
    });

    if (!site) {
      return sendError(res, 'Site not found', 404);
    }

    // Staff: deny access to NON-PVR sites
    if (req.user?.role === 'staff' && site.siteType !== 'pvr') {
      return sendError(res, 'Site not found', 404);
    }

    return sendSuccess(res, { site });
  } catch (error: any) {
    console.error('Get site error:', error);
    return sendError(res, 'Failed to fetch site', 500, error.message);
  }
}

export async function createSite(req: Request, res: Response) {
  try {
    const { siteName, siteType } = req.body;

    if (!siteName) {
      return sendError(res, 'Site name is required', 400);
    }

    const site = await prisma.site.create({
      data: {
        siteName,
        siteType: siteType === 'non_pvr' ? 'non_pvr' : 'pvr',
      },
    });

    return sendSuccess(res, { site }, 'Site created successfully', 201);
  } catch (error: any) {
    console.error('Create site error:', error);
    return sendError(res, 'Failed to create site', 500, error.message);
  }
}

export async function updateSite(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { siteName, siteType } = req.body;

    if (!siteName) {
      return sendError(res, 'Site name is required', 400);
    }

    const updateData: { siteName: string; siteType?: 'pvr' | 'non_pvr' } = { siteName };
    if (siteType !== undefined) {
      updateData.siteType = siteType === 'non_pvr' ? 'non_pvr' : 'pvr';
    }

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(res, { site }, 'Site updated successfully');
  } catch (error: any) {
    console.error('Update site error:', error);
    return sendError(res, 'Failed to update site', 500, error.message);
  }
}

export async function deleteSite(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.site.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Site deleted successfully');
  } catch (error: any) {
    console.error('Delete site error:', error);
    return sendError(res, 'Failed to delete site', 500, error.message);
  }
}

// ============================================
// AUDI CONTROLLERS
// ============================================

export async function getAllAudis(req: AuthRequest, res: Response) {
  try {
    const { siteId } = req.query;

    const where: any = {};

    if (siteId) {
      where.siteId = siteId as string;
    }

    // Staff: restrict to audis belonging to PVR sites only
    if (req.user?.role === 'staff') {
      where.site = { siteType: 'pvr' };
    }

    const audis = await prisma.audi.findMany({
      where,
      include: {
        site: true,
        projector: {
          include: {
            projectorModel: true,
          },
        },
      },
      orderBy: { audiNo: 'asc' },
    });

    return sendSuccess(res, { audis });
  } catch (error: any) {
    console.error('Get audis error:', error);
    return sendError(res, 'Failed to fetch audis', 500, error.message);
  }
}

export async function getAudiById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const audi = await prisma.audi.findUnique({
      where: { id },
      include: {
        site: true,
        projector: {
          include: {
            projectorModel: true,
          },
        },
      },
    });

    if (!audi) {
      return sendError(res, 'Audi not found', 404);
    }

    return sendSuccess(res, { audi });
  } catch (error: any) {
    console.error('Get audi error:', error);
    return sendError(res, 'Failed to fetch audi', 500, error.message);
  }
}

export async function createAudi(req: Request, res: Response) {
  try {
    const { audiNo, siteId, projectorId } = req.body;

    if (!audiNo || !siteId) {
      return sendError(res, 'Audi number and site ID are required', 400);
    }

    const audi = await prisma.audi.create({
      data: {
        audiNo,
        siteId,
        projectorId: projectorId || null,
      },
      include: {
        site: true,
        projector: {
          include: {
            projectorModel: true,
          },
        },
      },
    });

    return sendSuccess(res, { audi }, 'Audi created successfully', 201);
  } catch (error: any) {
    console.error('Create audi error:', error);
    return sendError(res, 'Failed to create audi', 500, error.message);
  }
}

export async function updateAudi(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { audiNo, siteId, projectorId } = req.body;

    const updateData: any = {};
    if (audiNo) updateData.audiNo = audiNo;
    if (siteId) updateData.siteId = siteId;
    if (projectorId !== undefined) updateData.projectorId = projectorId || null;

    const audi = await prisma.audi.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        projector: {
          include: {
            projectorModel: true,
          },
        },
      },
    });

    return sendSuccess(res, { audi }, 'Audi updated successfully');
  } catch (error: any) {
    console.error('Update audi error:', error);
    return sendError(res, 'Failed to update audi', 500, error.message);
  }
}

export async function deleteAudi(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.audi.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Audi deleted successfully');
  } catch (error: any) {
    console.error('Delete audi error:', error);
    return sendError(res, 'Failed to delete audi', 500, error.message);
  }
}

// ============================================
// PROJECTOR CONTROLLERS
// ============================================

export async function getAllProjectors(req: Request, res: Response) {
  try {
    const { search } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { serialNumber: { contains: search as string, mode: 'insensitive' } },
        { projectorModel: { modelNo: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const projectors = await prisma.projector.findMany({
      where,
      include: {
        projectorModel: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, { projectors, total: projectors.length });
  } catch (error: any) {
    console.error('Get projectors error:', error);
    return sendError(res, 'Failed to fetch projectors', 500, error.message);
  }
}

export async function getProjectorById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const projector = await prisma.projector.findUnique({
      where: { id },
      include: {
        projectorModel: true,
        audis: {
          include: {
            site: true,
          },
        },
      },
    });

    if (!projector) {
      return sendError(res, 'Projector not found', 404);
    }

    return sendSuccess(res, { projector });
  } catch (error: any) {
    console.error('Get projector error:', error);
    return sendError(res, 'Failed to fetch projector', 500, error.message);
  }
}

export async function createProjector(req: Request, res: Response) {
  try {
    const { serialNumber, projectorModelId, status, installationDate, notes } = req.body;

    if (!serialNumber || !projectorModelId) {
      return sendError(res, 'Serial number and projector model ID are required', 400);
    }

    // Verify the projector model exists
    const model = await prisma.projectorModel.findUnique({
      where: { id: projectorModelId },
    });

    if (!model) {
      return sendError(res, 'Projector model not found', 404);
    }

    const projector = await prisma.projector.create({
      data: {
        serialNumber,
        projectorModelId,
        status: status || 'active',
        installationDate: installationDate ? new Date(installationDate) : null,
        notes: notes || null,
      },
      include: {
        projectorModel: true,
      },
    });

    return sendSuccess(res, { projector }, 'Projector created successfully', 201);
  } catch (error: any) {
    console.error('Create projector error:', error);
    if (error.code === 'P2002') {
      return sendError(res, 'Projector with this serial number already exists', 400);
    }
    return sendError(res, 'Failed to create projector', 500, error.message);
  }
}

export async function updateProjector(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { serialNumber, projectorModelId, status, installationDate, notes } = req.body;

    const updateData: any = {};
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (projectorModelId !== undefined) {
      // Verify the new model exists
      const model = await prisma.projectorModel.findUnique({
        where: { id: projectorModelId },
      });
      if (!model) {
        return sendError(res, 'Projector model not found', 404);
      }
      updateData.projectorModelId = projectorModelId;
    }
    if (status !== undefined) updateData.status = status;
    if (installationDate !== undefined) updateData.installationDate = installationDate ? new Date(installationDate) : null;
    if (notes !== undefined) updateData.notes = notes || null;

    const projector = await prisma.projector.update({
      where: { id },
      data: updateData,
      include: {
        projectorModel: true,
      },
    });

    return sendSuccess(res, { projector }, 'Projector updated successfully');
  } catch (error: any) {
    console.error('Update projector error:', error);
    if (error.code === 'P2002') {
      return sendError(res, 'Projector with this serial number already exists', 400);
    }
    if (error.code === 'P2025') {
      return sendError(res, 'Projector not found', 404);
    }
    return sendError(res, 'Failed to update projector', 500, error.message);
  }
}

export async function deleteProjector(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.projector.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Projector deleted successfully');
  } catch (error: any) {
    console.error('Delete projector error:', error);
    return sendError(res, 'Failed to delete projector', 500, error.message);
  }
}

// ============================================
// PROJECTOR TRANSFER CONTROLLER
// ============================================

// Transfer a projector from one audi/site to another
export async function transferProjector(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // projectorId
    const { toSiteId, toAudiId, reason } = req.body as {
      toSiteId?: string;
      toAudiId?: string;
      reason?: string;
    };

    if (!toSiteId || !toAudiId) {
      return sendError(res, 'Target site and audi are required', 400);
    }

    // 1. Verify projector exists
    const projector = await prisma.projector.findUnique({
      where: { id },
    });

    if (!projector) {
      return sendError(res, 'Projector not found', 404);
    }

    // 2. Find current audi (if any)
    const currentAudi = await prisma.audi.findFirst({
      where: { projectorId: id },
    });

    // 3. Verify target audi and site
    const targetAudi = await prisma.audi.findUnique({
      where: { id: toAudiId },
      include: { site: true },
    });

    if (!targetAudi) {
      return sendError(res, 'Target audi not found', 404);
    }

    if (targetAudi.siteId !== toSiteId) {
      return sendError(res, 'Target audi does not belong to the specified site', 400);
    }

    // 4. Ensure target audi is not already linked to a different projector
    if (targetAudi.projectorId && targetAudi.projectorId !== id) {
      return sendError(
        res,
        'Target audi already has a different projector assigned. Please clear it first or choose another audi.',
        400
      );
    }

    // 5. Perform transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Clear projector from current audi, if any
      if (currentAudi && currentAudi.id !== targetAudi.id) {
        await tx.audi.update({
          where: { id: currentAudi.id },
          data: { projectorId: null },
        });
      }

      // Assign projector to target audi
      const updatedTargetAudi = await tx.audi.update({
        where: { id: targetAudi.id },
        data: { projectorId: id },
        include: {
          site: true,
          projector: {
            include: { projectorModel: true },
          },
        },
      });

      // Create transfer log
      const transferLog = await tx.projectorTransfer.create({
        data: {
          projectorId: id,
          fromSiteId: currentAudi ? currentAudi.siteId : null,
          fromAudiId: currentAudi ? currentAudi.id : null,
          toSiteId,
          toAudiId,
          movedBy: req.user?.userId || null,
          reason: reason || null,
        },
      });

      return { updatedTargetAudi, transferLog };
    });

    return sendSuccess(
      res,
      {
        projectorId: id,
        audi: result.updatedTargetAudi,
        transfer: result.transferLog,
      },
      'Projector transferred successfully'
    );
  } catch (error: any) {
    console.error('Transfer projector error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    return sendError(res, 'Failed to transfer projector', 500, error.message);
  }
}

