import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getAllPartNameAliases,
  upsertPartNameAlias,
  deletePartNameAlias,
  normalizePartName,
} from '../utils/partName.util';
import { prisma } from '../utils/prisma.util';

// Get all part name aliases
export async function getAllAliases(req: AuthRequest, res: Response) {
  try {
    const aliases = await getAllPartNameAliases();
    return sendSuccess(res, { aliases });
  } catch (error: any) {
    console.error('Get part name aliases error:', error);
    return sendError(res, 'Failed to fetch part name aliases', 500, error.message);
  }
}

// Get single alias by ID
export async function getAliasById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const alias = await prisma.partNameAlias.findUnique({
      where: { id },
    });

    if (!alias) {
      return sendError(res, 'Part name alias not found', 404);
    }

    return sendSuccess(res, { alias });
  } catch (error: any) {
    console.error('Get part name alias error:', error);
    return sendError(res, 'Failed to fetch part name alias', 500, error.message);
  }
}

// Create or update part name alias
export async function createOrUpdateAlias(req: AuthRequest, res: Response) {
  try {
    const { alias, canonicalName } = req.body;

    if (!alias || !canonicalName) {
      return sendError(res, 'Both alias and canonicalName are required', 400);
    }

    const result = await upsertPartNameAlias(alias, canonicalName);
    return sendSuccess(res, { alias: result }, 'Part name alias created/updated successfully');
  } catch (error: any) {
    console.error('Create/update part name alias error:', error);
    return sendError(res, 'Failed to create/update part name alias', 500, error.message);
  }
}

// Delete part name alias
export async function deleteAlias(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Get alias first to check if it exists
    const alias = await prisma.partNameAlias.findUnique({
      where: { id },
    });

    if (!alias) {
      return sendError(res, 'Part name alias not found', 404);
    }

    await deletePartNameAlias(alias.alias);
    return sendSuccess(res, null, 'Part name alias deleted successfully');
  } catch (error: any) {
    console.error('Delete part name alias error:', error);
    return sendError(res, 'Failed to delete part name alias', 500, error.message);
  }
}

// Test normalization (for admin/testing)
export async function testNormalization(req: AuthRequest, res: Response) {
  try {
    const { partName } = req.query;

    if (!partName || typeof partName !== 'string') {
      return sendError(res, 'partName query parameter is required', 400);
    }

    const normalized = await normalizePartName(partName);
    return sendSuccess(res, {
      original: partName,
      normalized: normalized,
    });
  } catch (error: any) {
    console.error('Test normalization error:', error);
    return sendError(res, 'Failed to test normalization', 500, error.message);
  }
}

// Bulk normalize part names (for migration/testing)
export async function bulkNormalize(req: AuthRequest, res: Response) {
  try {
    const { partNames } = req.body;

    if (!Array.isArray(partNames)) {
      return sendError(res, 'partNames must be an array', 400);
    }

    const normalized = await Promise.all(
      partNames.map(async (name: string) => ({
        original: name,
        normalized: await normalizePartName(name),
      }))
    );

    return sendSuccess(res, { results: normalized });
  } catch (error: any) {
    console.error('Bulk normalize error:', error);
    return sendError(res, 'Failed to bulk normalize', 500, error.message);
  }
}
