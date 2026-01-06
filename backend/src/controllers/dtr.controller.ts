import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import { sendAssignmentEmail, sendStatusChangeEmail, sendOverdueCaseEmail } from '../utils/email.util';
import { findMatchingRule, getAssignedUser } from '../utils/assignmentRule.util';
import { getNotificationPreferencesForUser } from './notificationPreference.controller';

// Get all DTR cases with filters
export async function getAllDtrCases(req: AuthRequest, res: Response) {
  try {
    const { status, severity, assignedTo, search, page = '1', limit = '50' } = req.query;

    const where: any = {};

    if (status) where.callStatus = status;
    if (severity) where.caseSeverity = severity;
    if (assignedTo) where.assignedTo = assignedTo;

    if (search) {
      where.OR = [
        { caseNumber: { contains: search as string, mode: 'insensitive' } },
        { natureOfProblem: { contains: search as string, mode: 'insensitive' } },
        { unitModel: { contains: search as string, mode: 'insensitive' } },
        { unitSerial: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Enforce maximum limit to prevent connection pool exhaustion
    const maxLimit = 100;
    const take = Math.min(Number(limit), maxLimit);
    const skip = (Number(page) - 1) * take;

    const [cases, total] = await Promise.all([
      prisma.dtrCase.findMany({
        where,
        include: {
          site: true,
          audi: {
            include: {
              projector: {
                include: {
                  projectorModel: true,
                },
              },
            },
          },
          creator: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
          closer: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.dtrCase.count({ where }),
    ]);

    // Manually fetch audit logs for all cases
    const caseIds = cases.map(c => c.id);
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        caseId: { in: caseIds },
        caseType: 'DTR',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { performedAt: 'desc' },
    });

    // Map audit logs to cases
    const casesWithAuditLogs = cases.map(c => ({
      ...c,
      auditLog: auditLogs.filter(log => log.caseId === c.id).map(log => ({
        id: log.id,
        action: log.action,
        details: log.description || '',
        timestamp: log.performedAt,
        user: log.user.email,
      })),
    }));

    return sendSuccess(res, { cases: casesWithAuditLogs, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    console.error('Get DTR cases error:', error);
    return sendError(res, 'Failed to fetch DTR cases', 500, error.message);
  }
}

// Get single DTR case by ID
export async function getDtrCaseById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [dtrCase, auditLogs] = await Promise.all([
      prisma.dtrCase.findUnique({
        where: { id },
        include: {
          site: true,
          audi: {
            include: {
              projector: {
                include: {
                  projectorModel: true,
                },
              },
            },
          },
          creator: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
          closer: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          caseId: id,
          caseType: 'DTR',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { performedAt: 'desc' },
      }),
    ]);

    if (!dtrCase) {
      return sendError(res, 'DTR case not found', 404);
    }

    return sendSuccess(res, { case: { ...dtrCase, auditLogs } });
  } catch (error: any) {
    console.error('Get DTR case error:', error);
    return sendError(res, 'Failed to fetch DTR case', 500, error.message);
  }
}

// Create new DTR case
export async function createDtrCase(req: AuthRequest, res: Response) {
  try {
    const {
      caseNumber,
      errorDate,
      siteId,
      audiId,
      unitModel,
      unitSerial,
      natureOfProblem,
      actionTaken,
      remarks,
      callStatus,
      caseSeverity,
      assignedTo,
    } = req.body;

    if (!caseNumber || !errorDate || !siteId || !audiId || !unitModel || !unitSerial || !natureOfProblem) {
      return sendError(res, 'Missing required fields', 400);
    }

    // Handle assignedTo: convert email to user ID if needed, or use auto-assignment
    let assignedToUserId: string | null = null;
    if (assignedTo) {
      // Check if assignedTo is an email or user ID
      if (typeof assignedTo === 'string' && assignedTo.includes('@')) {
        // It's an email, find the user
        const user = await prisma.user.findUnique({
          where: { email: assignedTo },
          select: { id: true },
        });
        
        if (!user) {
          return sendError(res, `User with email ${assignedTo} not found`, 404);
        }
        
        assignedToUserId = user.id;
      } else {
        // It's already a user ID
        assignedToUserId = assignedTo;
      }
    } else {
      // Auto-assignment: Try to find matching rule
      try {
        const rule = await findMatchingRule('DTR', {
          siteId,
          caseSeverity: caseSeverity || 'medium',
        });
        
        if (rule) {
          const autoAssignedUserId = await getAssignedUser(rule);
          if (autoAssignedUserId) {
            assignedToUserId = autoAssignedUserId;
            console.log(`[Auto-Assignment] DTR case ${caseNumber} auto-assigned to user ${autoAssignedUserId} via rule ${rule.name}`);
          }
        }
      } catch (error) {
        console.error('[Auto-Assignment] Error during auto-assignment:', error);
        // Continue without auto-assignment if it fails
      }
    }

    // Create DTR case
    const dtrCase = await prisma.dtrCase.create({
      data: {
        caseNumber,
        errorDate: new Date(errorDate),
        siteId,
        audiId,
        unitModel,
        unitSerial,
        natureOfProblem,
        actionTaken: actionTaken || null,
        remarks: remarks || null,
        callStatus: callStatus || 'open',
        caseSeverity: caseSeverity || 'medium',
        createdBy: req.user!.userId,
        assignedTo: assignedToUserId,
      },
      include: {
        site: true,
        audi: {
          include: {
            projector: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: dtrCase.id,
        caseType: 'DTR',
        action: 'Created',
        description: `DTR case created by ${req.user!.email}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email if assigned
    if (assignedToUserId && dtrCase.assignee?.email) {
      const prefs = await getNotificationPreferencesForUser(assignedToUserId);
      
      // In-app notification
      if (prefs.inAppCaseAssigned) {
        await prisma.notification.create({
          data: {
            userId: assignedToUserId,
            title: 'New DTR Case Assigned',
            message: `You have been assigned to DTR Case #${caseNumber}`,
            type: 'assignment',
            caseId: dtrCase.id,
            caseType: 'DTR',
          },
        });
      }

      // Email notification
      if (prefs.emailCaseAssigned) {
        sendAssignmentEmail({
          to: dtrCase.assignee.email,
          engineerName: dtrCase.assignee.name,
          caseType: 'DTR',
          caseNumber: dtrCase.caseNumber,
          createdBy: dtrCase.creator?.email,
        }).catch((err) => console.error('DTR assignment email error:', err));
      }
    }

    return sendSuccess(res, { case: dtrCase }, 'DTR case created successfully', 201);
  } catch (error: any) {
    console.error('Create DTR case error:', error);
    return sendError(res, 'Failed to create DTR case', 500, error.message);
  }
}

// Update DTR case
export async function updateDtrCase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get the current case to check for assignment and status changes
    const currentCase = await prisma.dtrCase.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentCase) {
      return sendError(res, 'DTR case not found', 404);
    }

    const oldStatus = currentCase.callStatus;
    const newStatus = updateData.callStatus;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.caseNumber;
    delete updateData.createdBy;
    delete updateData.createdAt;
    
    // Remove nested objects that shouldn't be sent to Prisma update
    delete updateData.site;
    delete updateData.audi;
    delete updateData.creator;
    delete updateData.assignee;
    delete updateData.closer;
    delete updateData.auditLog;
    delete updateData.auditLogs;

    // Handle assignedTo: convert email to user ID if needed
    if (updateData.assignedTo) {
      // Check if assignedTo is an email or user ID
      if (typeof updateData.assignedTo === 'string' && updateData.assignedTo.includes('@')) {
        // It's an email, find the user
        const user = await prisma.user.findUnique({
          where: { email: updateData.assignedTo },
          select: { id: true },
        });
        
        if (!user) {
          return sendError(res, `User with email ${updateData.assignedTo} not found`, 404);
        }
        
        updateData.assignedTo = user.id;
      }
    }

    // Convert date if present
    if (updateData.errorDate) {
      updateData.errorDate = new Date(updateData.errorDate);
    }

    const dtrCase = await prisma.dtrCase.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        audi: {
          include: {
            projector: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: dtrCase.id,
        caseType: 'DTR',
        action: 'Updated',
        description: `DTR case updated by ${req.user!.email}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email if assignedTo changed
    if (updateData.assignedTo && updateData.assignedTo !== currentCase.assignedTo && dtrCase.assignee?.email) {
      const prefs = await getNotificationPreferencesForUser(updateData.assignedTo);
      
      if (prefs.inAppCaseAssigned) {
        await prisma.notification.create({
          data: {
            userId: updateData.assignedTo,
            title: 'DTR Case Assigned',
            message: `You have been assigned to DTR Case #${dtrCase.caseNumber}`,
            type: 'assignment',
            caseId: dtrCase.id,
            caseType: 'DTR',
          },
        });
      }

      if (prefs.emailCaseAssigned) {
        sendAssignmentEmail({
          to: dtrCase.assignee.email,
          engineerName: dtrCase.assignee.name,
          caseType: 'DTR',
          caseNumber: dtrCase.caseNumber,
          createdBy: dtrCase.creator?.email,
        }).catch((err) => console.error('DTR reassignment email error:', err));
      }
    }

    // Send notification + email if status changed
    if (newStatus && oldStatus !== newStatus && dtrCase.assignee) {
      const prefs = await getNotificationPreferencesForUser(dtrCase.assignee.id);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (prefs.inAppStatusChanged) {
        await prisma.notification.create({
          data: {
            userId: dtrCase.assignee.id,
            title: 'DTR Case Status Changed',
            message: `DTR Case #${dtrCase.caseNumber} status changed from ${oldStatus} to ${newStatus}`,
            type: 'status_change',
            caseId: dtrCase.id,
            caseType: 'DTR',
          },
        });
      }

      if (prefs.emailStatusChanged && dtrCase.assignee.email) {
        sendStatusChangeEmail({
          to: dtrCase.assignee.email,
          userName: dtrCase.assignee.name,
          caseType: 'DTR',
          caseNumber: dtrCase.caseNumber,
          oldStatus,
          newStatus,
          link: `${frontendUrl}/#dtr`,
        }).catch((err) => console.error('DTR status change email error:', err));
      }
    }

    return sendSuccess(res, { case: dtrCase }, 'DTR case updated successfully');
  } catch (error: any) {
    console.error('Update DTR case error:', error);
    return sendError(res, 'Failed to update DTR case', 500, error.message);
  }
}

// Assign DTR case to engineer
export async function assignDtrCase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return sendError(res, 'Engineer email or ID is required', 400);
    }

    // Check if assignedTo is an email or user ID
    // If it contains @, treat it as email and look up user ID
    let userId: string;
    if (assignedTo.includes('@')) {
      // It's an email, find the user
      const user = await prisma.user.findUnique({
        where: { email: assignedTo },
        select: { id: true, name: true, email: true },
      });
      
      if (!user) {
        return sendError(res, `User with email ${assignedTo} not found`, 404);
      }
      
      userId = user.id;
    } else {
      // It's already a user ID
      userId = assignedTo;
    }

    const dtrCase = await prisma.dtrCase.update({
      where: { id },
      data: { assignedTo: userId },
      include: {
        site: true,
        audi: {
          include: {
            projector: {
              include: {
                projectorModel: true,
              },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: dtrCase.id,
        caseType: 'DTR',
        action: 'Assigned',
        description: `Assigned to ${dtrCase.assignee?.name || assignedTo}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email to the assigned user
    await prisma.notification.create({
      data: {
        userId: userId,
        title: 'DTR Case Assigned',
        message: `You have been assigned to DTR Case #${dtrCase.caseNumber}`,
        type: 'assignment',
        caseId: dtrCase.id,
        caseType: 'DTR',
      },
    });

    if (dtrCase.assignee?.email) {
      sendAssignmentEmail({
        to: dtrCase.assignee.email,
        engineerName: dtrCase.assignee.name,
        caseType: 'DTR',
        caseNumber: dtrCase.caseNumber,
        createdBy: dtrCase.creator?.email,
      }).catch((err) => console.error('DTR assign endpoint email error:', err));
    }

    return sendSuccess(res, { case: dtrCase }, 'DTR case assigned successfully');
  } catch (error: any) {
    console.error('Assign DTR case error:', error);
    return sendError(res, 'Failed to assign DTR case', 500, error.message);
  }
}

// Update DTR case status
export async function updateDtrStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status is required', 400);
    }

    const dtrCase = await prisma.dtrCase.update({
      where: { id },
      data: { callStatus: status },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: dtrCase.id,
        caseType: 'DTR',
        action: 'Status Changed',
        description: `Status changed to ${status}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification to assignee if exists
    if (dtrCase.assignedTo) {
      await prisma.notification.create({
        data: {
          userId: dtrCase.assignedTo,
          title: 'DTR Case Status Updated',
          message: `DTR Case #${dtrCase.caseNumber} status changed to ${status}`,
          type: 'status_change',
          caseId: dtrCase.id,
          caseType: 'DTR',
        },
      });
    }

    return sendSuccess(res, { case: dtrCase }, 'Status updated successfully');
  } catch (error: any) {
    console.error('Update DTR status error:', error);
    return sendError(res, 'Failed to update status', 500, error.message);
  }
}

// Close DTR case
export async function closeDtrCase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { finalRemarks } = req.body;

    const dtrCase = await prisma.dtrCase.update({
      where: { id },
      data: {
        callStatus: 'closed',
        closedBy: req.user!.userId,
        closedDate: new Date(),
        finalRemarks: finalRemarks || null,
      },
      include: {
        closer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: dtrCase.id,
        caseType: 'DTR',
        action: 'Closed',
        description: `Case closed by ${req.user!.email}`,
        performedBy: req.user!.userId,
      },
    });

    return sendSuccess(res, { case: dtrCase }, 'DTR case closed successfully');
  } catch (error: any) {
    console.error('Close DTR case error:', error);
    return sendError(res, 'Failed to close DTR case', 500, error.message);
  }
}

// Delete DTR case (admin only)
export async function deleteDtrCase(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.dtrCase.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'DTR case deleted successfully');
  } catch (error: any) {
    console.error('Delete DTR case error:', error);
    return sendError(res, 'Failed to delete DTR case', 500, error.message);
  }
}

// Get audit logs for DTR case
export async function getDtrAuditLogs(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        caseId: id,
        caseType: 'DTR',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { performedAt: 'desc' },
    });

    return sendSuccess(res, { auditLogs });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    return sendError(res, 'Failed to fetch audit logs', 500, error.message);
  }
}

