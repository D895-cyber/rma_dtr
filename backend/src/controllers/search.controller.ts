import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

// Get all saved searches
export async function getSavedSearches(req: AuthRequest, res: Response) {
  try {
    const { caseType } = req.query;

    const searches = await prisma.savedSearch.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { isPublic: true },
        ],
        ...(caseType && { caseType: caseType as string }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return sendSuccess(res, { searches });
  } catch (error: any) {
    console.error('Get saved searches error:', error);
    return sendError(res, 'Failed to fetch saved searches', 500, error.message);
  }
}

// Get single saved search by ID
export async function getSavedSearchById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const search = await prisma.savedSearch.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.userId },
          { isPublic: true },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!search) {
      return sendError(res, 'Saved search not found', 404);
    }

    return sendSuccess(res, { search });
  } catch (error: any) {
    console.error('Get saved search error:', error);
    return sendError(res, 'Failed to fetch saved search', 500, error.message);
  }
}

// Create saved search
export async function createSavedSearch(req: AuthRequest, res: Response) {
  try {
    const { name, description, caseType, filters, isPublic } = req.body;

    if (!name || !caseType || !filters) {
      return sendError(res, 'Name, caseType, and filters are required', 400);
    }

    const search = await prisma.savedSearch.create({
      data: {
        name,
        description,
        caseType,
        filters,
        isPublic: isPublic ?? false,
        userId: req.user!.userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return sendSuccess(res, { search }, 'Saved search created successfully');
  } catch (error: any) {
    console.error('Create saved search error:', error);
    return sendError(res, 'Failed to create saved search', 500, error.message);
  }
}

// Update saved search
export async function updateSavedSearch(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, filters, isPublic } = req.body;

    const existingSearch = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!existingSearch) {
      return sendError(res, 'Saved search not found', 404);
    }

    if (existingSearch.userId !== req.user!.userId) {
      return sendError(res, 'You do not have permission to update this search', 403);
    }

    const search = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(filters && { filters }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return sendSuccess(res, { search }, 'Saved search updated successfully');
  } catch (error: any) {
    console.error('Update saved search error:', error);
    return sendError(res, 'Failed to update saved search', 500, error.message);
  }
}

// Use saved search (increment usage count)
export async function useSavedSearch(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const search = await prisma.savedSearch.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.userId },
          { isPublic: true },
        ],
      },
    });

    if (!search) {
      return sendError(res, 'Saved search not found', 404);
    }

    // Increment usage count
    await prisma.savedSearch.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return sendSuccess(res, { search }, 'Saved search used successfully');
  } catch (error: any) {
    console.error('Use saved search error:', error);
    return sendError(res, 'Failed to use saved search', 500, error.message);
  }
}

// Delete saved search
export async function deleteSavedSearch(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const search = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!search) {
      return sendError(res, 'Saved search not found', 404);
    }

    if (search.userId !== req.user!.userId) {
      return sendError(res, 'You do not have permission to delete this search', 403);
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Saved search deleted successfully');
  } catch (error: any) {
    console.error('Delete saved search error:', error);
    return sendError(res, 'Failed to delete saved search', 500, error.message);
  }
}

