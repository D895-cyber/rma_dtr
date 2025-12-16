import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import { sendAssignmentEmail, sendRmaClientEmail } from '../utils/email.util';

// Get all RMA cases with filters
export async function getAllRmaCases(req: AuthRequest, res: Response) {
  try {
    const { status, type, assignedTo, search, page = '1', limit = '10000' } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (type) where.rmaType = type;
    if (assignedTo) where.assignedTo = assignedTo;

    if (search) {
      where.OR = [
        { rmaNumber: { contains: search as string, mode: 'insensitive' } },
        { productName: { contains: search as string, mode: 'insensitive' } },
        { serialNumber: { contains: search as string, mode: 'insensitive' } },
        { symptoms: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [cases, total] = await Promise.all([
      prisma.rmaCase.findMany({
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.rmaCase.count({ where }),
    ]);

    // Manually fetch audit logs for all cases
    const caseIds = cases.map(c => c.id);
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        caseId: { in: caseIds },
        caseType: 'RMA',
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
    console.error('Get RMA cases error:', error);
    return sendError(res, 'Failed to fetch RMA cases', 500, error.message);
  }
}

// Get single RMA case by ID
export async function getRmaCaseById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [rmaCase, auditLogs] = await Promise.all([
      prisma.rmaCase.findUnique({
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
        },
      }),
      prisma.auditLog.findMany({
        where: {
          caseId: id,
          caseType: 'RMA',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { performedAt: 'desc' },
      }),
    ]);

    if (!rmaCase) {
      return sendError(res, 'RMA case not found', 404);
    }

    return sendSuccess(res, { case: { ...rmaCase, auditLogs } });
  } catch (error: any) {
    console.error('Get RMA case error:', error);
    return sendError(res, 'Failed to fetch RMA case', 500, error.message);
  }
}

// Create new RMA case
export async function createRmaCase(req: AuthRequest, res: Response) {
  try {
    const {
      rmaType,
      callLogNumber,
      rmaNumber,
      rmaOrderNumber,
      rmaRaisedDate,
      customerErrorDate,
      siteId,
      audiId,
      productName,
      productPartNumber,
      serialNumber,
      defectDetails,
      defectivePartNumber,
      defectivePartName,
      defectivePartSerial,
      isDefectivePartDNR,
      defectivePartDNRReason,
      replacedPartNumber,
      replacedPartSerial,
      symptoms,
      shippingCarrier,
      trackingNumberOut,
      shippedDate,
      returnShippedDate,
      returnTrackingNumber,
      returnShippedThrough,
      status,
      assignedTo,
      notes,
    } = req.body;

    // Updated validation: rmaNumber and rmaOrderNumber are now OPTIONAL
    if (!rmaType || !rmaRaisedDate || !customerErrorDate || !siteId || !productName || !productPartNumber || !serialNumber) {
      return sendError(res, 'Missing required fields: rmaType, rmaRaisedDate, customerErrorDate, siteId, productName, productPartNumber, serialNumber', 400);
    }

    // Validate RMA Type
    const validRmaTypes = ['RMA', 'SRMA', 'RMA_CL', 'Lamps'];
    if (!validRmaTypes.includes(rmaType)) {
      return sendError(res, `Invalid RMA type. Must be one of: RMA, SRMA, RMA_CL, Lamps`, 400);
    }

    // Create RMA case
    const rmaCase = await prisma.rmaCase.create({
      data: {
        rmaType,
        callLogNumber: callLogNumber || null,
        rmaNumber: rmaNumber || null,  // Now optional
        rmaOrderNumber: rmaOrderNumber || null,  // Now optional
        rmaRaisedDate: new Date(rmaRaisedDate),
        customerErrorDate: new Date(customerErrorDate),
        siteId,
        audiId: audiId || null,
        productName,
        productPartNumber,
        serialNumber,
        defectDetails: defectDetails || null,
        defectivePartNumber: defectivePartNumber || null,
        defectivePartName: defectivePartName || null,
        defectivePartSerial: defectivePartSerial || null,
        isDefectivePartDNR: isDefectivePartDNR || false,  // DNR = Do Not Return to OEM
        defectivePartDNRReason: defectivePartDNRReason || null,  // Reason for DNR
        replacedPartNumber: replacedPartNumber || null,
        replacedPartSerial: replacedPartSerial || null,
        symptoms: symptoms || null,
        shippingCarrier: shippingCarrier || null,
        trackingNumberOut: trackingNumberOut || null,
        shippedDate: shippedDate ? new Date(shippedDate) : null,
        returnShippedDate: returnShippedDate ? new Date(returnShippedDate) : null,
        returnTrackingNumber: returnTrackingNumber || null,
        returnShippedThrough: returnShippedThrough || null,
        status: status || 'open',  // Default to 'open'
        createdBy: req.user!.userId,
        assignedTo: assignedTo || null,
        notes: notes || null,
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
        caseId: rmaCase.id,
        caseType: 'RMA',
        action: 'Created',
        description: `RMA case created by ${req.user!.email}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email if assigned
    if (assignedTo && rmaCase.assignee?.email) {
      await prisma.notification.create({
        data: {
          userId: assignedTo,
          title: 'New RMA Case Assigned',
          message: `You have been assigned to RMA Case #${rmaNumber || rmaCase.callLogNumber || 'N/A'}`,
          type: 'assignment',
          caseId: rmaCase.id,
          caseType: 'RMA',
        },
      });

      sendAssignmentEmail({
        to: rmaCase.assignee.email,
        engineerName: rmaCase.assignee.name,
        caseType: 'RMA',
        caseNumber: rmaCase.rmaNumber || rmaCase.callLogNumber || 'N/A',
        createdBy: rmaCase.creator?.email,
      }).catch((err) => console.error('RMA assignment email error:', err));
    }

    return sendSuccess(res, { case: rmaCase }, 'RMA case created successfully', 201);
  } catch (error: any) {
    console.error('Create RMA case error:', error);
    return sendError(res, 'Failed to create RMA case', 500, error.message);
  }
}

// Update RMA case
export async function updateRmaCase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get the current case to check for assignment changes
    const currentCase = await prisma.rmaCase.findUnique({
      where: { id },
      select: { assignedTo: true, rmaNumber: true, callLogNumber: true },
    });

    if (!currentCase) {
      return sendError(res, 'RMA case not found', 404);
    }

    // Remove fields that shouldn't be updated directly or are nested objects
    delete updateData.id;
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.site; // Remove nested site object
    delete updateData.audi; // Remove nested audi object
    delete updateData.creator; // Remove nested creator object
    delete updateData.assignee; // Remove nested assignee object
    delete updateData.auditLog; // Remove nested audit log array

    // Only keep allowed fields for update
    const allowedFields = [
      'rmaType',
      'callLogNumber',
      'rmaNumber',
      'rmaOrderNumber',
      'rmaRaisedDate',
      'customerErrorDate',
      'siteId',
      'audiId',
      'productName',
      'productPartNumber',
      'serialNumber',
      'defectDetails',
      'defectivePartNumber',
      'defectivePartName',
      'defectivePartSerial',
      'isDefectivePartDNR',
      'defectivePartDNRReason',
      'replacedPartNumber',
      'replacedPartSerial',
      'symptoms',
      'shippingCarrier',
      'trackingNumberOut',
      'shippedDate',
      'returnShippedDate',
      'returnTrackingNumber',
      'returnShippedThrough',
      'status',
      'assignedTo',
      'notes',
    ];

    // Build clean update data with only allowed fields
    const cleanUpdateData: any = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        cleanUpdateData[field] = updateData[field];
      }
    }

    // Handle assignedTo: convert email to user ID if needed
    if (cleanUpdateData.assignedTo && cleanUpdateData.assignedTo !== '' && cleanUpdateData.assignedTo !== 'null') {
      // Check if assignedTo is an email or user ID
      if (cleanUpdateData.assignedTo.includes('@')) {
        // It's an email, find the user
        const user = await prisma.user.findUnique({
          where: { email: cleanUpdateData.assignedTo },
          select: { id: true },
        });
        
        if (!user) {
          return sendError(res, `User with email ${cleanUpdateData.assignedTo} not found`, 404);
        }
        
        cleanUpdateData.assignedTo = user.id;
      }
    }

    // Convert dates if present
    if (cleanUpdateData.rmaRaisedDate) cleanUpdateData.rmaRaisedDate = new Date(cleanUpdateData.rmaRaisedDate);
    if (cleanUpdateData.customerErrorDate) cleanUpdateData.customerErrorDate = new Date(cleanUpdateData.customerErrorDate);
    if (cleanUpdateData.shippedDate) cleanUpdateData.shippedDate = new Date(cleanUpdateData.shippedDate);
    if (cleanUpdateData.returnShippedDate) cleanUpdateData.returnShippedDate = new Date(cleanUpdateData.returnShippedDate);

    // Convert null strings to null
    if (cleanUpdateData.assignedTo === '' || cleanUpdateData.assignedTo === 'null') cleanUpdateData.assignedTo = null;
    if (cleanUpdateData.audiId === '' || cleanUpdateData.audiId === 'null') cleanUpdateData.audiId = null;
    if (cleanUpdateData.defectivePartDNRReason === '' || cleanUpdateData.defectivePartDNRReason === 'null') cleanUpdateData.defectivePartDNRReason = null;

    const rmaCase = await prisma.rmaCase.update({
      where: { id },
      data: cleanUpdateData,
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
        caseId: rmaCase.id,
        caseType: 'RMA',
        action: 'Updated',
        description: `RMA case updated by ${req.user!.email}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email if assignedTo changed
    if (cleanUpdateData.assignedTo && cleanUpdateData.assignedTo !== currentCase.assignedTo && rmaCase.assignee?.email) {
      await prisma.notification.create({
        data: {
          userId: cleanUpdateData.assignedTo,
          title: 'RMA Case Assigned',
          message: `You have been assigned to RMA Case #${rmaCase.rmaNumber || rmaCase.callLogNumber || 'N/A'}`,
          type: 'assignment',
          caseId: rmaCase.id,
          caseType: 'RMA',
        },
      });

      sendAssignmentEmail({
        to: rmaCase.assignee.email,
        engineerName: rmaCase.assignee.name,
        caseType: 'RMA',
        caseNumber: rmaCase.rmaNumber || rmaCase.callLogNumber || 'N/A',
        createdBy: rmaCase.creator?.email,
      }).catch((err) => console.error('RMA reassignment email error:', err));
    }

    return sendSuccess(res, { case: rmaCase }, 'RMA case updated successfully');
  } catch (error: any) {
    console.error('Update RMA case error:', error);
    return sendError(res, 'Failed to update RMA case', 500, error.message);
  }
}

// Assign RMA case to engineer
export async function assignRmaCase(req: AuthRequest, res: Response) {
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

    const rmaCase = await prisma.rmaCase.update({
      where: { id },
      data: { assignedTo: userId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: rmaCase.id,
        caseType: 'RMA',
        action: 'Assigned',
        description: `Assigned to ${rmaCase.assignee?.name || assignedTo}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification + email to the assigned user
    await prisma.notification.create({
      data: {
        userId: userId,
        title: 'RMA Case Assigned',
        message: `You have been assigned to RMA Case #${rmaCase.rmaNumber || rmaCase.callLogNumber || 'N/A'}`,
        type: 'assignment',
        caseId: rmaCase.id,
        caseType: 'RMA',
      },
    });

    if (rmaCase.assignee?.email) {
      sendAssignmentEmail({
        to: rmaCase.assignee.email,
        engineerName: rmaCase.assignee.name,
        caseType: 'RMA',
        caseNumber: rmaCase.rmaNumber || rmaCase.callLogNumber || 'N/A',
        createdBy: rmaCase.creator?.email,
      }).catch((err) => console.error('RMA assign endpoint email error:', err));
    }

    return sendSuccess(res, { case: rmaCase }, 'RMA case assigned successfully');
  } catch (error: any) {
    console.error('Assign RMA case error:', error);
    return sendError(res, 'Failed to assign RMA case', 500, error.message);
  }
}

// Update RMA case status
export async function updateRmaStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status is required', 400);
    }

    const rmaCase = await prisma.rmaCase.update({
      where: { id },
      data: { status },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: rmaCase.id,
        caseType: 'RMA',
        action: 'Status Changed',
        description: `Status changed to ${status}`,
        performedBy: req.user!.userId,
      },
    });

    // Send notification to assignee if exists
    if (rmaCase.assignedTo) {
      await prisma.notification.create({
        data: {
          userId: rmaCase.assignedTo,
          title: 'RMA Case Status Updated',
          message: `RMA Case #${rmaCase.rmaNumber} status changed to ${status}`,
          type: 'status_change',
          caseId: rmaCase.id,
          caseType: 'RMA',
        },
      });
    }

    return sendSuccess(res, { case: rmaCase }, 'Status updated successfully');
  } catch (error: any) {
    console.error('Update RMA status error:', error);
    return sendError(res, 'Failed to update status', 500, error.message);
  }
}

// Update RMA tracking information
export async function updateRmaTracking(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      shippingCarrier,
      trackingNumberOut,
      shippedDate,
      returnShippedDate,
      returnTrackingNumber,
      returnShippedThrough,
    } = req.body;

    const updateData: any = {};
    if (shippingCarrier) updateData.shippingCarrier = shippingCarrier;
    if (trackingNumberOut) updateData.trackingNumberOut = trackingNumberOut;
    if (shippedDate) updateData.shippedDate = new Date(shippedDate);
    if (returnShippedDate) updateData.returnShippedDate = new Date(returnShippedDate);
    if (returnTrackingNumber) updateData.returnTrackingNumber = returnTrackingNumber;
    if (returnShippedThrough) updateData.returnShippedThrough = returnShippedThrough;

    const rmaCase = await prisma.rmaCase.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: rmaCase.id,
        caseType: 'RMA',
        action: 'Tracking Updated',
        description: 'Tracking information updated',
        performedBy: req.user!.userId,
      },
    });

    return sendSuccess(res, { case: rmaCase }, 'Tracking information updated successfully');
  } catch (error: any) {
    console.error('Update RMA tracking error:', error);
    return sendError(res, 'Failed to update tracking', 500, error.message);
  }
}

// Send RMA docket email to client
export async function emailRmaClient(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { email, clientName } = req.body as { email?: string; clientName?: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return sendError(res, 'Valid client email is required', 400);
    }

    const rmaCase = await prisma.rmaCase.findUnique({
      where: { id },
      include: {
        site: true,
      },
    });

    if (!rmaCase) {
      return sendError(res, 'RMA case not found', 404);
    }

    // Validate that replacement part details exist
    if (!rmaCase.replacedPartNumber) {
      return sendError(
        res,
        'Replacement part details are not present. Please add Replacement Part Number before sending email to client.',
        400
      );
    }

    // Check if at least one tracking detail exists (optional but recommended)
    const hasTrackingInfo = !!(rmaCase.shippingCarrier || rmaCase.trackingNumberOut || rmaCase.shippedDate);
    if (!hasTrackingInfo) {
      return sendError(
        res,
        'Replacement shipment details are not present. Please add Shipping Carrier, Tracking Number, or Shipped Date before sending email to client.',
        400
      );
    }

    const caseNumber = rmaCase.rmaNumber || rmaCase.callLogNumber || rmaCase.id;

    // Format shipped date if present
    const shippedDateFormatted = rmaCase.shippedDate
      ? new Date(rmaCase.shippedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    await sendRmaClientEmail({
      to: email,
      clientName: clientName || null,
      caseNumber,
      siteName: (rmaCase as any).site?.siteName || null,
      replacedPartNumber: rmaCase.replacedPartNumber,
      shippingCarrier: rmaCase.shippingCarrier,
      trackingNumberOut: rmaCase.trackingNumberOut,
      shippedDate: shippedDateFormatted,
    });

    // Record in audit log
    await prisma.auditLog.create({
      data: {
        caseId: rmaCase.id,
        caseType: 'RMA',
        action: 'Client Email Sent',
        description: `Client email sent to ${email} with replacement part details`,
        performedBy: req.user!.userId,
      },
    });

    return sendSuccess(res, null, 'Client email sent successfully');
  } catch (error: any) {
    console.error('Email RMA client error:', error);
    return sendError(res, 'Failed to send client email', 500, error.message);
  }
}

// Delete RMA case (admin only)
export async function deleteRmaCase(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.rmaCase.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'RMA case deleted successfully');
  } catch (error: any) {
    console.error('Delete RMA case error:', error);
    return sendError(res, 'Failed to delete RMA case', 500, error.message);
  }
}

// Get audit logs for RMA case
export async function getRmaAuditLogs(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        caseId: id,
        caseType: 'RMA',
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

