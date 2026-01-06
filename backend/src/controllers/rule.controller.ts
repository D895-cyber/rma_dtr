import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

// Get all assignment rules
export async function getRules(req: AuthRequest, res: Response) {
  try {
    const { caseType } = req.query;

    const rules = await prisma.assignmentRule.findMany({
      where: {
        ...(caseType && { caseType: caseType as string }),
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return sendSuccess(res, { rules });
  } catch (error: any) {
    console.error('Get rules error:', error);
    return sendError(res, 'Failed to fetch assignment rules', 500, error.message);
  }
}

// Get single rule by ID
export async function getRuleById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const rule = await prisma.assignmentRule.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!rule) {
      return sendError(res, 'Rule not found', 404);
    }

    return sendSuccess(res, { rule });
  } catch (error: any) {
    console.error('Get rule error:', error);
    return sendError(res, 'Failed to fetch rule', 500, error.message);
  }
}

// Create assignment rule
export async function createRule(req: AuthRequest, res: Response) {
  try {
    const { name, description, caseType, conditions, assignTo, assignToRole, priority, isActive } = req.body;

    if (!name || !caseType || !conditions) {
      return sendError(res, 'Name, caseType, and conditions are required', 400);
    }

    if (!assignTo && !assignToRole) {
      return sendError(res, 'Either assignTo or assignToRole must be provided', 400);
    }

    const rule = await prisma.assignmentRule.create({
      data: {
        name,
        description,
        caseType,
        conditions,
        assignTo: assignTo || null,
        assignToRole: assignToRole || null,
        priority: priority ?? 0,
        isActive: isActive ?? true,
        createdBy: req.user!.userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return sendSuccess(res, { rule }, 'Assignment rule created successfully');
  } catch (error: any) {
    console.error('Create rule error:', error);
    return sendError(res, 'Failed to create assignment rule', 500, error.message);
  }
}

// Update assignment rule
export async function updateRule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, conditions, assignTo, assignToRole, priority, isActive } = req.body;

    const existingRule = await prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return sendError(res, 'Rule not found', 404);
    }

    const rule = await prisma.assignmentRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(conditions && { conditions }),
        ...(assignTo !== undefined && { assignTo: assignTo || null }),
        ...(assignToRole !== undefined && { assignToRole: assignToRole || null }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return sendSuccess(res, { rule }, 'Assignment rule updated successfully');
  } catch (error: any) {
    console.error('Update rule error:', error);
    return sendError(res, 'Failed to update assignment rule', 500, error.message);
  }
}

// Delete assignment rule
export async function deleteRule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const rule = await prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return sendError(res, 'Rule not found', 404);
    }

    await prisma.assignmentRule.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Assignment rule deleted successfully');
  } catch (error: any) {
    console.error('Delete rule error:', error);
    return sendError(res, 'Failed to delete assignment rule', 500, error.message);
  }
}

// Test rule (check if it would match given case data)
export async function testRule(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { caseData } = req.body;

    const rule = await prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return sendError(res, 'Rule not found', 404);
    }

    // Simple condition matching (same logic as in assignmentRule.util.ts)
    let matches = true;
    if (rule.conditions && typeof rule.conditions === 'object') {
      for (const [key, value] of Object.entries(rule.conditions)) {
        const caseValue = getNestedValue(caseData, key);
        if (Array.isArray(value)) {
          if (!value.includes(caseValue)) {
            matches = false;
            break;
          }
        } else if (caseValue !== value) {
          matches = false;
          break;
        }
      }
    }

    return sendSuccess(res, { matches, rule });
  } catch (error: any) {
    console.error('Test rule error:', error);
    return sendError(res, 'Failed to test rule', 500, error.message);
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

