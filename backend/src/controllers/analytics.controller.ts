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

// Get RMA Part Analytics
export async function getRmaPartAnalytics(req: AuthRequest, res: Response) {
  try {
    const { fromDate, toDate, partName, partNumber } = req.query;

    // Build where clause for date range
    const dateWhere: any = {};
    if (fromDate) {
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, gte: new Date(fromDate as string) };
    }
    if (toDate) {
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, lte: new Date(toDate as string) };
    }

    // Build where clause for part search (search in all part fields)
    const partWhere: any[] = [];
    if (partName || partNumber) {
      const searchTerm = (partName || partNumber) as string;
      partWhere.push(
        { productPartNumber: { contains: searchTerm, mode: 'insensitive' } },
        { defectivePartNumber: { contains: searchTerm, mode: 'insensitive' } },
        { defectivePartName: { contains: searchTerm, mode: 'insensitive' } },
        { replacedPartNumber: { contains: searchTerm, mode: 'insensitive' } },
        { productName: { contains: searchTerm, mode: 'insensitive' } }
      );
    }

    // Combine where clauses
    const where: any = { ...dateWhere };
    if (partWhere.length > 0) {
      where.OR = partWhere;
    }

    // Get all matching RMA cases (limit to prevent connection exhaustion)
    // For analytics, we don't need all data - we can aggregate in the database
    const rmaCases = await prisma.rmaCase.findMany({
      where,
      select: {
        id: true,
        rmaNumber: true,
        callLogNumber: true,
        rmaRaisedDate: true,
        productPartNumber: true,
        defectivePartNumber: true,
        defectivePartName: true,
        replacedPartNumber: true,
        status: true,
        rmaType: true,
        defectDetails: true,
        symptoms: true,
        site: {
          select: {
            siteName: true,
          },
        },
      },
      orderBy: { rmaRaisedDate: 'desc' },
      take: 10000, // Limit to prevent excessive data fetching
    });

    // 1. Total count
    const totalCount = rmaCases.length;

    // 2. Status breakdown
    const statusBreakdown = rmaCases.reduce((acc: any, rma) => {
      acc[rma.status] = (acc[rma.status] || 0) + 1;
      return acc;
    }, {});

    // 3. Defect patterns/trends - group by defect details or symptoms
    const defectPatterns: Record<string, number> = {};
    rmaCases.forEach((rma) => {
      // Use defectDetails first, then symptoms, then defectivePartName as fallback
      const defectKey = rma.defectDetails || rma.symptoms || rma.defectivePartName || 'Unknown';
      // Normalize: take first 50 chars to group similar defects
      const normalizedKey = defectKey.substring(0, 50).trim();
      defectPatterns[normalizedKey] = (defectPatterns[normalizedKey] || 0) + 1;
    });

    // Get top defect patterns
    const topDefectPatterns = Object.entries(defectPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));

    // 4. Frequency/trend over time
    // Determine grouping based on date range
    let dateGrouping: 'day' | 'week' | 'month' = 'month';
    if (fromDate && toDate) {
      const from = new Date(fromDate as string);
      const to = new Date(toDate as string);
      const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        dateGrouping = 'day';
      } else if (daysDiff <= 90) {
        dateGrouping = 'week';
      } else {
        dateGrouping = 'month';
      }
    }

    const trendData: Record<string, number> = {};
    rmaCases.forEach((rma) => {
      const date = new Date(rma.rmaRaisedDate);
      let key: string;
      
      if (dateGrouping === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (dateGrouping === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate() + 6) / 7)).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }
      
      trendData[key] = (trendData[key] || 0) + 1;
    });

    // Convert to array and sort
    const trends = Object.entries(trendData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Part-specific breakdown
    const partBreakdown = {
      productParts: rmaCases.filter(rma => rma.productPartNumber).length,
      defectiveParts: rmaCases.filter(rma => rma.defectivePartNumber).length,
      replacedParts: rmaCases.filter(rma => rma.replacedPartNumber).length,
    };

    // 6. Site distribution
    const siteDistribution = rmaCases.reduce((acc: any, rma) => {
      const siteName = rma.site?.siteName || 'Unknown';
      acc[siteName] = (acc[siteName] || 0) + 1;
      return acc;
    }, {});

    const topSites = Object.entries(siteDistribution)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([site, count]) => ({ site, count }));

    // 7. RMA Type breakdown
    const typeBreakdown = rmaCases.reduce((acc: any, rma) => {
      acc[rma.rmaType] = (acc[rma.rmaType] || 0) + 1;
      return acc;
    }, {});

    return sendSuccess(res, {
      summary: {
        totalCount,
        dateRange: {
          from: fromDate || null,
          to: toDate || null,
        },
        partFilter: {
          name: partName || null,
          number: partNumber || null,
        },
      },
      statusBreakdown,
      defectPatterns: topDefectPatterns,
      trends,
      partBreakdown,
      siteDistribution: topSites,
      typeBreakdown,
      cases: rmaCases.map(rma => ({
        id: rma.id,
        rmaNumber: rma.rmaNumber,
        callLogNumber: rma.callLogNumber,
        rmaRaisedDate: rma.rmaRaisedDate,
        productPartNumber: rma.productPartNumber,
        defectivePartNumber: rma.defectivePartNumber,
        defectivePartName: rma.defectivePartName,
        replacedPartNumber: rma.replacedPartNumber,
        status: rma.status,
        siteName: rma.site?.siteName || 'Unknown',
        defectDetails: rma.defectDetails,
      })),
    });
  } catch (error: any) {
    console.error('Get RMA part analytics error:', error);
    return sendError(res, 'Failed to fetch RMA part analytics', 500, error.message);
  }
}

