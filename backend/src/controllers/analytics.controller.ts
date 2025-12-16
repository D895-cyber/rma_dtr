import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

// Get dashboard statistics
export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // DTR Statistics
    const [
      totalDtrCases,
      openDtrCases,
      inProgressDtrCases,
      closedDtrCases,
      criticalDtrCases,
      myAssignedDtrCases,
    ] = await Promise.all([
      prisma.dtrCase.count(),
      prisma.dtrCase.count({ where: { callStatus: 'open' } }),
      prisma.dtrCase.count({ where: { callStatus: 'in_progress' } }),
      prisma.dtrCase.count({ where: { callStatus: 'closed' } }),
      prisma.dtrCase.count({ where: { caseSeverity: 'critical' } }),
      prisma.dtrCase.count({ where: { assignedTo: userId } }),
    ]);

    // RMA Statistics
    const [
      totalRmaCases,
      openRmaCases,
      rmaRaisedRmaCases,
      faultyInTransitRmaCases,
      closedRmaCases,
      myAssignedRmaCases,
    ] = await Promise.all([
      prisma.rmaCase.count(),
      prisma.rmaCase.count({ where: { status: 'open' } }),
      prisma.rmaCase.count({ where: { status: 'rma_raised_yet_to_deliver' } }),
      prisma.rmaCase.count({ where: { status: 'faulty_in_transit_to_cds' } }),
      prisma.rmaCase.count({ where: { status: 'closed' } }),
      prisma.rmaCase.count({ where: { assignedTo: userId } }),
    ]);

    // Severity breakdown (DTR)
    const severityBreakdown = await prisma.dtrCase.groupBy({
      by: ['caseSeverity'],
      _count: true,
    });

    // Recent window (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentDtrCases, recentRmaCases] = await Promise.all([
      prisma.dtrCase.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.rmaCase.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // Get recent case objects (last 5) for dashboard display
    const [recentDtrCasesList, recentRmaCasesList] = await Promise.all([
      prisma.dtrCase.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
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
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.rmaCase.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
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
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    // Overdue RMA: status faulty_in_transit_to_cds and shippedDate older than 30 days
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    const [overdueRmaCount, overdueRmaCasesList] = await Promise.all([
      prisma.rmaCase.count({
        where: {
          status: 'faulty_in_transit_to_cds',
          shippedDate: {
            lt: overdueThreshold,
          },
        },
      }),
      prisma.rmaCase.findMany({
        where: {
          status: 'faulty_in_transit_to_cds',
          shippedDate: {
            lt: overdueThreshold,
          },
        },
        orderBy: { shippedDate: 'asc' },
        take: 5,
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
        },
      }),
    ]);

    return sendSuccess(res, {
      dtr: {
        total: totalDtrCases,
        open: openDtrCases,
        inProgress: inProgressDtrCases,
        closed: closedDtrCases,
        critical: criticalDtrCases,
        myAssigned: myAssignedDtrCases,
        recent: recentDtrCases,
        recentCases: recentDtrCasesList,
      },
      rma: {
        total: totalRmaCases,
        open: openRmaCases,
        rmaRaisedYetToDeliver: rmaRaisedRmaCases,
        faultyInTransitToCds: faultyInTransitRmaCases,
        closed: closedRmaCases,
        myAssigned: myAssignedRmaCases,
        recent: recentRmaCases,
        recentCases: recentRmaCasesList,
        overdue: overdueRmaCount,
        overdueCases: overdueRmaCasesList,
      },
      severity: severityBreakdown.reduce((acc, item) => {
        acc[item.caseSeverity] = item._count;
        return acc;
      }, {} as any),
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return sendError(res, 'Failed to fetch dashboard statistics', 500, error.message);
  }
}

// Get trend data
export async function getTrends(req: Request, res: Response) {
  try {
    const { period = '7d', type = 'dtr' } = req.query;

    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cases = type === 'dtr' 
      ? await prisma.dtrCase.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true },
        })
      : await prisma.rmaCase.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true },
        });

    // Group by date
    const trendData: Record<string, number> = {};
    cases.forEach((caseItem: any) => {
      const date = caseItem.createdAt.toISOString().split('T')[0];
      trendData[date] = (trendData[date] || 0) + 1;
    });

    // Fill missing dates with 0
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends.push({
        date: dateStr,
        count: trendData[dateStr] || 0,
      });
    }

    return sendSuccess(res, { trends });
  } catch (error: any) {
    console.error('Get trends error:', error);
    return sendError(res, 'Failed to fetch trends', 500, error.message);
  }
}

// Get severity breakdown
export async function getSeverityBreakdown(req: Request, res: Response) {
  try {
    const breakdown = await prisma.dtrCase.groupBy({
      by: ['caseSeverity'],
      _count: true,
    });

    const result = breakdown.reduce((acc, item) => {
      acc[item.caseSeverity] = item._count;
      return acc;
    }, {} as any);

    return sendSuccess(res, result);
  } catch (error: any) {
    console.error('Get severity breakdown error:', error);
    return sendError(res, 'Failed to fetch severity breakdown', 500, error.message);
  }
}

// Get engineer performance (admin/manager only)
export async function getEngineerPerformance(req: Request, res: Response) {
  try {
    const engineers = await prisma.user.findMany({
      where: {
        role: 'engineer',
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const performance = await Promise.all(
      engineers.map(async (engineer) => {
        const [assignedDtr, closedDtr, assignedRma, closedRma] = await Promise.all([
          prisma.dtrCase.count({ where: { assignedTo: engineer.id } }),
          prisma.dtrCase.count({ where: { closedBy: engineer.id } }),
          prisma.rmaCase.count({ where: { assignedTo: engineer.id } }),
          prisma.rmaCase.count({ where: { assignedTo: engineer.id, status: 'closed' } }),
        ]);

        return {
          ...engineer,
          dtr: {
            assigned: assignedDtr,
            closed: closedDtr,
          },
          rma: {
            assigned: assignedRma,
            closed: closedRma,
          },
          totalAssigned: assignedDtr + assignedRma,
          totalCompleted: closedDtr + closedRma,
        };
      })
    );

    return sendSuccess(res, { engineers: performance });
  } catch (error: any) {
    console.error('Get engineer performance error:', error);
    return sendError(res, 'Failed to fetch engineer performance', 500, error.message);
  }
}

// Get site statistics
export async function getSiteStats(req: Request, res: Response) {
  try {
    const sites = await prisma.site.findMany({
      select: {
        id: true,
        siteName: true,
        _count: {
          select: {
            audis: true,
            dtrCases: true,
            rmaCases: true,
          },
        },
      },
    });

    return sendSuccess(res, { sites });
  } catch (error: any) {
    console.error('Get site stats error:', error);
    return sendError(res, 'Failed to fetch site statistics', 500, error.message);
  }
}

