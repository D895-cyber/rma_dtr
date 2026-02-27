import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import { normalizePartName } from '../utils/partName.util';

// Staff users see only PVR sites' data
function getStaffPvrWhere(role: string | undefined) {
  if (role === 'staff') return { site: { siteType: 'pvr' as const } };
  return {};
}

// Get dashboard statistics
export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const pvrWhere = getStaffPvrWhere(userRole);

    // DTR Statistics
    const [
      totalDtrCases,
      openDtrCases,
      inProgressDtrCases,
      closedDtrCases,
      criticalDtrCases,
      myAssignedDtrCases,
    ] = await Promise.all([
      prisma.dtrCase.count({ where: pvrWhere }),
      prisma.dtrCase.count({ where: { ...pvrWhere, callStatus: 'open' } }),
      prisma.dtrCase.count({ where: { ...pvrWhere, callStatus: 'in_progress' } }),
      prisma.dtrCase.count({ where: { ...pvrWhere, callStatus: 'closed' } }),
      prisma.dtrCase.count({ where: { ...pvrWhere, caseSeverity: 'critical' } }),
      prisma.dtrCase.count({ where: { ...pvrWhere, assignedTo: userId } }),
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
      prisma.rmaCase.count({ where: pvrWhere }),
      prisma.rmaCase.count({ where: { ...pvrWhere, status: 'open' } }),
      prisma.rmaCase.count({ where: { ...pvrWhere, status: 'rma_raised_yet_to_deliver' } }),
      prisma.rmaCase.count({ where: { ...pvrWhere, status: 'faulty_in_transit_to_cds' } }),
      prisma.rmaCase.count({ where: { ...pvrWhere, status: 'closed' } }),
      prisma.rmaCase.count({ where: { ...pvrWhere, assignedTo: userId } }),
    ]);

    // Severity breakdown (DTR)
    const severityBreakdown = await prisma.dtrCase.groupBy({
      by: ['caseSeverity'],
      _count: true,
      where: pvrWhere,
    });

    // Recent window (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentDtrCases, recentRmaCases] = await Promise.all([
      prisma.dtrCase.count({
        where: { ...pvrWhere, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.rmaCase.count({
        where: { ...pvrWhere, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    // Get recent case objects (last 5) for dashboard display
    const [recentDtrCasesList, recentRmaCasesList] = await Promise.all([
      prisma.dtrCase.findMany({
        where: pvrWhere,
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
        where: pvrWhere,
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
          ...pvrWhere,
          status: 'faulty_in_transit_to_cds',
          shippedDate: {
            lt: overdueThreshold,
          },
        },
      }),
      prisma.rmaCase.findMany({
        where: {
          ...pvrWhere,
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
export async function getTrends(req: AuthRequest, res: Response) {
  try {
    const { period = '7d', type = 'dtr' } = req.query;
    const pvrWhere = getStaffPvrWhere(req.user?.role);

    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cases = type === 'dtr' 
      ? await prisma.dtrCase.findMany({
          where: { ...pvrWhere, createdAt: { gte: startDate } },
          select: { createdAt: true },
        })
      : await prisma.rmaCase.findMany({
          where: { ...pvrWhere, createdAt: { gte: startDate } },
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
export async function getSeverityBreakdown(req: AuthRequest, res: Response) {
  try {
    const pvrWhere = getStaffPvrWhere(req.user?.role);
    const breakdown = await prisma.dtrCase.groupBy({
      by: ['caseSeverity'],
      _count: true,
      where: pvrWhere,
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
export async function getEngineerPerformance(req: AuthRequest, res: Response) {
  try {
    const pvrWhere = getStaffPvrWhere(req.user?.role);
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
          prisma.dtrCase.count({ where: { ...pvrWhere, assignedTo: engineer.id } }),
          prisma.dtrCase.count({ where: { ...pvrWhere, closedBy: engineer.id } }),
          prisma.rmaCase.count({ where: { ...pvrWhere, assignedTo: engineer.id } }),
          prisma.rmaCase.count({ where: { ...pvrWhere, assignedTo: engineer.id, status: 'closed' } }),
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
export async function getSiteStats(req: AuthRequest, res: Response) {
  try {
    const where: any = {};
    if (req.user?.role === 'staff') {
      where.siteType = 'pvr';
    }
    const sites = await prisma.site.findMany({
      where,
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
    const { fromDate, toDate, partName, partNumber, exactMatch } = req.query;
    const pvrWhere = getStaffPvrWhere(req.user?.role);

    // Build where clause for date range
    const dateWhere: any = { ...pvrWhere };
    if (fromDate) {
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, gte: new Date(fromDate as string) };
    }
    if (toDate) {
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, lte: new Date(toDate as string) };
    }

    // Build where clause for part search (search in all part fields)
    const partWhere: any[] = [];
    if (partName || partNumber) {
      const rawSearchTerm = (partName || partNumber) as string;
      const searchTerm = rawSearchTerm.trim();

      // Safely normalize the exactMatch flag from query params
      let exactMatchFlag: string | boolean | undefined;
      if (typeof exactMatch === 'string') {
        exactMatchFlag = exactMatch;
      } else if (Array.isArray(exactMatch)) {
        const first = exactMatch[0];
        exactMatchFlag = typeof first === 'string' ? first : undefined;
      } else if (typeof exactMatch === 'boolean') {
        exactMatchFlag = exactMatch;
      }

      const isExact =
        (typeof exactMatchFlag === 'string' && exactMatchFlag.toLowerCase() === 'true') ||
        (typeof exactMatchFlag === 'boolean' && exactMatchFlag === true);

      if (isExact) {
        // Exact, case-insensitive match across all part fields
        partWhere.push(
          { productPartNumber: { equals: searchTerm, mode: 'insensitive' } },
          { defectivePartNumber: { equals: searchTerm, mode: 'insensitive' } },
          { defectivePartName: { equals: searchTerm, mode: 'insensitive' } },
          { replacedPartNumber: { equals: searchTerm, mode: 'insensitive' } },
          { productName: { equals: searchTerm, mode: 'insensitive' } }
        );
      } else {
        // Fuzzy search (default behaviour)
        partWhere.push(
          { productPartNumber: { contains: searchTerm, mode: 'insensitive' } },
          { defectivePartNumber: { contains: searchTerm, mode: 'insensitive' } },
          { defectivePartName: { contains: searchTerm, mode: 'insensitive' } },
          { replacedPartNumber: { contains: searchTerm, mode: 'insensitive' } },
          { productName: { contains: searchTerm, mode: 'insensitive' } }
        );
      }
    }

    // Combine where clauses
    const where: any = { ...dateWhere, ...pvrWhere };
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
      take: 2000, // Limit to prevent excessive data fetching and memory issues
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

// Get top 20 projectors by RMA count
export async function getTopProjectorsByRMA(req: AuthRequest, res: Response) {
  try {
    const { fromDate, toDate } = req.query;
    const pvrWhere = getStaffPvrWhere(req.user?.role);
    
    // Build date filter for RMA raised date
    const dateWhere: any = {
      ...pvrWhere,
      audiId: { not: null }, // Only RMAs with associated audi (which links to projector)
    };
    
    if (fromDate || toDate) {
      dateWhere.rmaRaisedDate = {};
      if (fromDate) {
        dateWhere.rmaRaisedDate.gte = new Date(fromDate as string);
      }
      if (toDate) {
        const toDateObj = new Date(toDate as string);
        toDateObj.setHours(23, 59, 59, 999); // End of day
        dateWhere.rmaRaisedDate.lte = toDateObj;
      }
    }
    
    // Get all RMA cases with their audi and projector relations
    const rmaCases = await prisma.rmaCase.findMany({
      where: dateWhere,
      include: {
        site: {
          select: {
            siteName: true,
          },
        },
        audi: {
          include: {
            projector: {
              include: {
                projectorModel: {
                  select: {
                    modelNo: true,
                    manufacturer: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Group by projector serial number and count RMAs
    const projectorStats: Record<string, {
      serialNumber: string;
      modelName: string | null;
      rmaCount: number;
      rmaCases: any[];
      siteCounts: Record<string, number>; // Track site frequency
      audiCounts: Record<string, number>; // Track audi frequency
    }> = {};

    rmaCases.forEach((rma) => {
      // Type assertion to handle the included relations
      const rmaWithAudi = rma as any;
      const projector = rmaWithAudi.audi?.projector;
      if (!projector || !projector.serialNumber) return;

      const serialNumber = projector.serialNumber;
      const modelName = projector.projectorModel?.modelNo || null;
      const siteName = rmaWithAudi.site?.siteName || 'Unknown';
      const audiNo = rmaWithAudi.audi?.audiNo || 'Unknown';
      
      if (!projectorStats[serialNumber]) {
        projectorStats[serialNumber] = {
          serialNumber,
          modelName,
          rmaCount: 0,
          rmaCases: [],
          siteCounts: {},
          audiCounts: {},
        };
      }
      
      // Count site and audi occurrences
      projectorStats[serialNumber].siteCounts[siteName] = (projectorStats[serialNumber].siteCounts[siteName] || 0) + 1;
      projectorStats[serialNumber].audiCounts[audiNo] = (projectorStats[serialNumber].audiCounts[audiNo] || 0) + 1;
      
      projectorStats[serialNumber].rmaCount++;
      
      // Store full RMA details for Excel export
      projectorStats[serialNumber].rmaCases.push({
        id: rma.id,
        rmaNumber: rma.rmaNumber,
        rmaOrderNumber: rma.rmaOrderNumber,
        callLogNumber: rma.callLogNumber,
        rmaType: rma.rmaType,
        rmaRaisedDate: rma.rmaRaisedDate,
        customerErrorDate: rma.customerErrorDate,
        status: rma.status,
        siteName: siteName,
        audiNo: audiNo,
        productName: rma.productName,
        productPartNumber: rma.productPartNumber,
        serialNumber: rma.serialNumber,
        defectivePartName: rma.defectivePartName,
        defectivePartNumber: rma.defectivePartNumber,
        defectivePartSerial: rma.defectivePartSerial,
        replacedPartNumber: rma.replacedPartNumber,
        replacedPartSerial: rma.replacedPartSerial,
        defectDetails: rma.defectDetails,
        symptoms: rma.symptoms,
        shippingCarrier: rma.shippingCarrier,
        trackingNumberOut: rma.trackingNumberOut,
        shippedDate: rma.shippedDate,
        returnTrackingNumber: rma.returnTrackingNumber,
        returnShippedDate: rma.returnShippedDate,
        returnShippedThrough: rma.returnShippedThrough,
        isDefectivePartDNR: rma.isDefectivePartDNR,
        defectivePartDNRReason: rma.defectivePartDNRReason,
        notes: rma.notes,
      });
    });

    // Convert to array, sort by count, and take top 20
    const topProjectors = Object.values(projectorStats)
      .sort((a, b) => b.rmaCount - a.rmaCount)
      .slice(0, 20)
      .map((projector, index) => {
        // Find most common site
        const mostCommonSite = Object.entries(projector.siteCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';
        
        // Find most common audi
        const mostCommonAudi = Object.entries(projector.audiCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';
        
        return {
          rank: index + 1,
          serialNumber: projector.serialNumber,
          modelName: projector.modelName || 'Unknown',
          siteName: mostCommonSite,
          audiNo: mostCommonAudi,
          rmaCount: projector.rmaCount,
          rmaCases: projector.rmaCases, // Include full RMA details for Excel export
        };
      });

    // Calculate total RMAs for percentage calculation
    const totalRMAs = rmaCases.length;
    const topProjectorsWithPercentage = topProjectors.map((projector) => ({
      ...projector,
      percentage: totalRMAs > 0 ? Number(((projector.rmaCount / totalRMAs) * 100).toFixed(2)) : 0,
    }));

    return sendSuccess(res, {
      projectors: topProjectorsWithPercentage,
      totalRMAs,
      summary: {
        totalProjectorsWithRMA: Object.keys(projectorStats).length,
        top20Count: topProjectorsWithPercentage.reduce((sum, p) => sum + p.rmaCount, 0),
      },
    });
  } catch (error: any) {
    console.error('Get top projectors by RMA error:', error);
    return sendError(res, 'Failed to fetch top projectors by RMA', 500, error.message);
  }
}

// Get RMA aging analytics: repeated RMAs for same part on same projector in short period
export async function getRmaAgingAnalytics(req: AuthRequest, res: Response) {
  try {
    const { 
      fromDate, 
      toDate, 
      thresholdDays = '30', 
      minRepeats = '2', 
      showOnlyShortest = 'false',
      serialNumbers, // Can be string or array
      partNames, // Can be string or array
      siteNames, // Can be string or array
    } = req.query;

    const threshold = Number(thresholdDays) || 30;
    const minRepeatCount = Number(minRepeats) || 2;
    const pvrWhere = getStaffPvrWhere(req.user?.role);
    // Handle query parameter type (can be string, array, or boolean)
    const onlyShortest = 
      (typeof showOnlyShortest === 'string' && showOnlyShortest === 'true') ||
      (typeof showOnlyShortest === 'boolean' && showOnlyShortest === true) ||
      (Array.isArray(showOnlyShortest) && showOnlyShortest[0] === 'true');

    // Build date filter and exclude cancelled cases
    const dateWhere: any = {
      ...pvrWhere,
      status: { not: 'cancelled' }, // Exclude cancelled RMA cases
    };
    if (fromDate) {
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, gte: new Date(fromDate as string) };
    }
    if (toDate) {
      const to = new Date(toDate as string);
      to.setHours(23, 59, 59, 999);
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, lte: to };
    }

    // Fetch RMA cases with projector + site info
    const rmaCases = await prisma.rmaCase.findMany({
      where: dateWhere,
      include: {
        site: {
          select: {
            siteName: true,
          },
        },
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
      orderBy: { rmaRaisedDate: 'asc' },
      take: 5000, // Limit to prevent memory exhaustion and slow queries
    });

    // Log warning if we hit the limit
    if (rmaCases.length >= 5000) {
      console.warn('⚠️  RMA aging analytics: Hit 5000 record limit. Results may be incomplete.');
    }

    // Group by projector + part
    type AgingRma = (typeof rmaCases)[number] & {
      projectorSerial: string;
      projectorModel?: string | null;
      normalizedPartKey: string; // This is now the normalized part NAME only
      partNumberKey: string | null;
      normalizedPartName: string;
    };

    const agingCases: AgingRma[] = [];

    // Batch normalize part names to reduce database queries
    const uniquePartNames = new Set<string>();
    rmaCases.forEach(rma => {
      if (rma.defectivePartName) {
        uniquePartNames.add(rma.defectivePartName);
      }
    });

    // Pre-normalize all unique part names
    const normalizationCache = new Map<string, string>();
    const normalizePromises = Array.from(uniquePartNames).map(async (partName) => {
      const normalized = await normalizePartName(partName);
      normalizationCache.set(partName, normalized || partName);
    });
    await Promise.all(normalizePromises);

    for (const rma of rmaCases) {
      const rmaWithAudi: any = rma as any;
      const projector = rmaWithAudi.audi?.projector;

      const projectorSerial: string =
        projector?.serialNumber ||
        rma.serialNumber ||
        'UNKNOWN';

      const projectorModel: string | null =
        projector?.projectorModel?.modelNo || null;

      // Use ONLY defectivePartName (primary) - no fallback
      const rawPartName = rma.defectivePartName || null;

      // Use cached normalization
      const normalizedName = rawPartName ? (normalizationCache.get(rawPartName) || rawPartName) : null;
      
      // Skip if no part name (we need a part name to group by)
      if (!normalizedName) {
        continue;
      }

      // Store part number for reference (but don't use for grouping)
      const partNumberKey: string | null =
        rma.defectivePartNumber ||
        rma.replacedPartNumber ||
        rma.productPartNumber ||
        null;

      agingCases.push({
        ...rma,
        projectorSerial,
        projectorModel,
        normalizedPartKey: normalizedName, // Use ONLY normalized part name for grouping
        partNumberKey,
        normalizedPartName: normalizedName,
      });
    }

    // Map: projectorSerial + partKey -> array of cases
    const groups: Record<string, AgingRma[]> = {};

    for (const rma of agingCases) {
      const key = `${rma.projectorSerial}::${rma.normalizedPartKey}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(rma);
    }

    // For each group, sort by date and find repeats within threshold
    const resultGroups: any[] = [];
    let totalRepeatPairs = 0;

    for (const [key, groupCases] of Object.entries(groups)) {
      if (groupCases.length < minRepeatCount) continue;

      // Already sorted globally, but sort again for safety
      groupCases.sort((a, b) => {
        return new Date(a.rmaRaisedDate).getTime() - new Date(b.rmaRaisedDate).getTime();
      });

      const repeatPairs: any[] = [];

      for (let i = 1; i < groupCases.length; i++) {
        const prev = groupCases[i - 1];
        const curr = groupCases[i];

        const diffMs =
          new Date(curr.rmaRaisedDate).getTime() -
          new Date(prev.rmaRaisedDate).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= threshold) {
          repeatPairs.push({
            firstCaseId: prev.id,
            secondCaseId: curr.id,
            firstRmaNumber: prev.rmaNumber,
            secondRmaNumber: curr.rmaNumber,
            firstCallLogNumber: prev.callLogNumber,
            secondCallLogNumber: curr.callLogNumber,
            firstDate: prev.rmaRaisedDate,
            secondDate: curr.rmaRaisedDate,
            daysBetween: diffDays,
          });
        }
      }

      if (repeatPairs.length === 0) continue;

      // If showOnlyShortest is true, keep only the pair with the shortest gap
      let finalRepeatPairs = repeatPairs;
      if (onlyShortest && repeatPairs.length > 0) {
        // Sort by daysBetween (ascending) and take the first one
        const sorted = [...repeatPairs].sort((a, b) => a.daysBetween - b.daysBetween);
        finalRepeatPairs = [sorted[0]];
      }

      totalRepeatPairs += finalRepeatPairs.length;

      const sample = groupCases[0];
      const [projectorSerial, normalizedPartName] = key.split('::');

      resultGroups.push({
        projectorSerial,
        projectorModel: sample.projectorModel || null,
        siteName: (sample as any).site?.siteName || 'Unknown',
        partNumber: sample.partNumberKey,
        partName: sample.defectivePartName || null, // Use only defectivePartName
        normalizedPartName: normalizedPartName, // The normalized part name used for grouping
        totalCases: groupCases.length,
        repeatPairs: finalRepeatPairs,
      });
    }

    // Apply filters if provided
    let filteredGroups = resultGroups;
    
    // Parse filter arrays (handle both string and array inputs)
    const parseFilterArray = (value: any): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map(v => String(v));
      return [String(value)];
    };

    const filterSerialNumbers = parseFilterArray(serialNumbers);
    const filterPartNames = parseFilterArray(partNames);
    const filterSiteNames = parseFilterArray(siteNames);

    // Apply filters (AND logic - all filters must match)
    if (filterSerialNumbers.length > 0 || filterPartNames.length > 0 || filterSiteNames.length > 0) {
      filteredGroups = resultGroups.filter((group) => {
        // Serial number filter
        if (filterSerialNumbers.length > 0) {
          const matchesSerial = filterSerialNumbers.some(
            (sn) => group.projectorSerial.toLowerCase().includes(sn.toLowerCase())
          );
          if (!matchesSerial) return false;
        }

        // Part name filter (check both normalized and original part name)
        if (filterPartNames.length > 0) {
          const matchesPart = filterPartNames.some(
            (pn) => {
              const normalizedFilter = pn.toLowerCase().trim();
              return (
                group.normalizedPartName.toLowerCase().includes(normalizedFilter) ||
                (group.partName && group.partName.toLowerCase().includes(normalizedFilter))
              );
            }
          );
          if (!matchesPart) return false;
        }

        // Site name filter
        if (filterSiteNames.length > 0) {
          const matchesSite = filterSiteNames.some(
            (sn) => group.siteName.toLowerCase().includes(sn.toLowerCase())
          );
          if (!matchesSite) return false;
        }

        return true;
      });
    }

    // Sort groups by number of repeat pairs (descending)
    filteredGroups.sort((a, b) => b.repeatPairs.length - a.repeatPairs.length);

    return sendSuccess(res, {
      summary: {
        totalRmaCases: rmaCases.length,
        totalGroups: Object.keys(groups).length,
        groupsWithRepeats: resultGroups.length,
        totalRepeatPairs,
        thresholdDays: threshold,
        minRepeats: minRepeatCount,
        showOnlyShortest: onlyShortest,
        dateRange: {
          from: fromDate || null,
          to: toDate || null,
        },
      },
      groups: filteredGroups,
    });
  } catch (error: any) {
    console.error('Get RMA aging analytics error:', error);
    return sendError(res, 'Failed to fetch RMA aging analytics', 500, error.message);
  }
}

// Get filter options for RMA aging analytics (for autocomplete)
export async function getRmaAgingFilterOptions(req: AuthRequest, res: Response) {
  try {
    const { fromDate, toDate } = req.query;
    const pvrWhere = getStaffPvrWhere(req.user?.role);

    // Build date filter and exclude cancelled cases
    const dateWhere: any = {
      ...pvrWhere,
      status: { not: 'cancelled' }, // Exclude cancelled RMA cases
    };
    if (fromDate) {
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, gte: new Date(fromDate as string) };
    }
    if (toDate) {
      const to = new Date(toDate as string);
      to.setHours(23, 59, 59, 999);
      dateWhere.rmaRaisedDate = { ...dateWhere.rmaRaisedDate, lte: to };
    }

    // Fetch RMA cases with projector + site info
    const rmaCases = await prisma.rmaCase.findMany({
      where: dateWhere,
      include: {
        site: {
          select: {
            siteName: true,
          },
        },
        audi: {
          include: {
            projector: {
              select: {
                serialNumber: true,
              },
            },
          },
        },
      },
      take: 10000, // Limit for filter options - sufficient for unique values
    });

    // Extract unique values
    const serialNumbers = new Set<string>();
    const partNames = new Set<string>();
    const siteNames = new Set<string>();

    for (const rma of rmaCases) {
      // Serial numbers
      const projectorSerial = (rma as any).audi?.projector?.serialNumber || rma.serialNumber;
      if (projectorSerial) {
        serialNumbers.add(projectorSerial);
      }

      // Part names (normalize them)
      if (rma.defectivePartName) {
        const normalized = await normalizePartName(rma.defectivePartName);
        if (normalized) {
          partNames.add(normalized);
        }
      }

      // Site names
      if ((rma as any).site?.siteName) {
        siteNames.add((rma as any).site.siteName);
      }
    }

    return sendSuccess(res, {
      serialNumbers: Array.from(serialNumbers).sort(),
      partNames: Array.from(partNames).sort(),
      siteNames: Array.from(siteNames).sort(),
    });
  } catch (error: any) {
    console.error('Get RMA aging filter options error:', error);
    return sendError(res, 'Failed to fetch filter options', 500, error.message);
  }
}

