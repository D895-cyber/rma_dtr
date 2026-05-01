import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';
import { sendError, sendSuccess } from '../utils/response.util';

function staffPvrConstraint(role: string | undefined) {
  if ((role || '').toLowerCase() === 'staff') {
    return { site: { siteType: 'pvr' as const } };
  }
  return {};
}

export async function getInsightsSites(req: AuthRequest, res: Response) {
  try {
    const pvrConstraint = staffPvrConstraint(req.user?.role);

    const sites = await prisma.site.findMany({
      where: (pvrConstraint as any).site ? { siteType: 'pvr' } : {},
      select: {
        id: true,
        siteName: true,
        siteType: true,
      },
      orderBy: { siteName: 'asc' },
    });

    const siteIds = sites.map((s) => s.id);
    if (siteIds.length === 0) {
      return sendSuccess(res, { sites: [] });
    }

    const [projectorPairs, rmaCounts] = await Promise.all([
      prisma.audi.groupBy({
        by: ['siteId', 'projectorId'],
        where: {
          siteId: { in: siteIds },
          projectorId: { not: null },
        },
        _count: true,
      }),
      prisma.rmaCase.groupBy({
        by: ['siteId'],
        where: {
          siteId: { in: siteIds },
          ...(pvrConstraint as any),
        },
        _count: true,
      }),
    ]);

    const projectorCountBySite = new Map<string, number>();
    for (const row of projectorPairs) {
      if (!row.siteId || !row.projectorId) continue;
      projectorCountBySite.set(row.siteId, (projectorCountBySite.get(row.siteId) || 0) + 1);
    }

    const rmaCountBySite = new Map<string, number>();
    for (const row of rmaCounts) {
      rmaCountBySite.set(row.siteId, (row as any)._count || (row as any)._count?.siteId || 0);
    }

    return sendSuccess(res, {
      sites: sites.map((s) => ({
        ...s,
        projectorCount: projectorCountBySite.get(s.id) || 0,
        rmaCount: rmaCountBySite.get(s.id) || 0,
      })),
    });
  } catch (error: any) {
    console.error('Insights sites error:', error);
    return sendError(res, 'Failed to fetch insights sites', 500, error.message);
  }
}

export async function getInsightsSiteProjectors(req: AuthRequest, res: Response) {
  try {
    const { siteId } = req.params;
    const role = (req.user?.role || '').toLowerCase();

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, siteName: true, siteType: true },
    });

    if (!site) {
      return sendError(res, 'Site not found', 404);
    }

    if (role === 'staff' && site.siteType !== 'pvr') {
      return sendError(res, 'Site not found', 404);
    }

    const projectors = await prisma.projector.findMany({
      where: {
        audis: {
          some: { siteId },
        },
      },
      include: {
        projectorModel: true,
        audis: {
          where: { siteId },
          select: { id: true, audiNo: true, siteId: true },
          orderBy: { audiNo: 'asc' },
        },
      },
      orderBy: { serialNumber: 'asc' },
    });

    const serials = projectors.map((p) => p.serialNumber).filter(Boolean);

    const [rmaCountRows, lastRmaRows] = await Promise.all([
      serials.length
        ? prisma.rmaCase.groupBy({
            by: ['serialNumber'],
            where: { siteId, serialNumber: { in: serials } },
            _count: true,
          })
        : Promise.resolve([] as any[]),
      serials.length
        ? prisma.rmaCase.groupBy({
            by: ['serialNumber'],
            where: { siteId, serialNumber: { in: serials } },
            _max: { rmaRaisedDate: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const rmaCountBySerial = new Map<string, number>();
    for (const row of rmaCountRows as any[]) {
      rmaCountBySerial.set(row.serialNumber, row._count || row._count?.serialNumber || 0);
    }

    const lastRmaBySerial = new Map<string, string | null>();
    for (const row of lastRmaRows as any[]) {
      lastRmaBySerial.set(row.serialNumber, row._max?.rmaRaisedDate ? new Date(row._max.rmaRaisedDate).toISOString() : null);
    }

    return sendSuccess(res, {
      site,
      projectors: projectors.map((p) => ({
        id: p.id,
        serialNumber: p.serialNumber,
        status: p.status,
        projectorModel: p.projectorModel,
        audis: p.audis,
        rmaCount: rmaCountBySerial.get(p.serialNumber) || 0,
        lastRmaRaisedDate: lastRmaBySerial.get(p.serialNumber) || null,
      })),
    });
  } catch (error: any) {
    console.error('Insights site projectors error:', error);
    return sendError(res, 'Failed to fetch site projectors insights', 500, error.message);
  }
}

export async function getInsightsProjectorAnalytics(req: AuthRequest, res: Response) {
  try {
    const { projectorId } = req.params;
    const pvrConstraint = staffPvrConstraint(req.user?.role);

    const projector = await prisma.projector.findUnique({
      where: { id: projectorId },
      include: {
        projectorModel: true,
        audis: {
          select: {
            id: true,
            audiNo: true,
            site: { select: { id: true, siteName: true, siteType: true } },
          },
          orderBy: { audiNo: 'asc' },
        },
      },
    });

    if (!projector) {
      return sendError(res, 'Projector not found', 404);
    }

    // Staff: only allow if projector is currently assigned to at least one PVR site
    if ((req.user?.role || '').toLowerCase() === 'staff') {
      const hasPvr = (projector.audis || []).some((a) => (a.site?.siteType || '').toString() === 'pvr');
      if (!hasPvr) {
        return sendError(res, 'Projector not found', 404);
      }
    }

    const whereBase: any = {
      ...(pvrConstraint as any),
      OR: [{ serialNumber: projector.serialNumber }, { audi: { projectorId } }],
    };

    const [
      totalRmaCount,
      byStatus,
      byType,
      byPart,
      recentRmas,
    ] = await Promise.all([
      prisma.rmaCase.count({ where: whereBase }),
      prisma.rmaCase.groupBy({
        by: ['status'],
        where: whereBase,
        _count: true,
      }),
      prisma.rmaCase.groupBy({
        by: ['rmaType'],
        where: whereBase,
        _count: true,
      }),
      prisma.rmaCase.groupBy({
        by: ['defectivePartName'],
        where: {
          ...whereBase,
          defectivePartName: { not: null },
        },
        _count: true,
      }),
      prisma.rmaCase.findMany({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rmaType: true,
          rmaNumber: true,
          callLogNumber: true,
          status: true,
          rmaRaisedDate: true,
          createdAt: true,
          defectivePartName: true,
          defectivePartNumber: true,
          serialNumber: true,
          productName: true,
          site: { select: { id: true, siteName: true, siteType: true } },
          audi: { select: { id: true, audiNo: true } },
        },
      }),
    ]);

    const partCounts = (byPart as any[])
      .map((row) => ({
        partName: row.defectivePartName || 'Unknown',
        count: row._count || row._count?.defectivePartName || 0,
      }))
      .filter((p) => p.partName && p.partName !== 'null')
      .sort((a, b) => b.count - a.count);

    const topPart = partCounts[0];
    const topPartShare = topPart && totalRmaCount > 0 ? Math.round((topPart.count / totalRmaCount) * 100) : 0;
    const recentTopParts = recentRmas.slice(0, 5).map((r) => (r.defectivePartName || '').trim()).filter(Boolean);
    const recentSamePart = recentTopParts.length >= 3 && new Set(recentTopParts).size === 1 ? recentTopParts[0] : null;

    const suggestions: string[] = [];
    if (topPart && topPartShare >= 40) {
      suggestions.push(`Most RMAs are for "${topPart.partName}" (${topPart.count} of ${totalRmaCount}, ~${topPartShare}%). Consider checking this part/root cause.`);
    }
    if (recentSamePart) {
      suggestions.push(`Recent RMAs repeatedly mention "${recentSamePart}". This could indicate a recurring/unresolved issue.`);
    }
    if (!suggestions.length && totalRmaCount > 0) {
      suggestions.push('No strong pattern detected yet. Review recent RMAs and monitor part-wise trends.');
    }

    return sendSuccess(res, {
      projector: {
        id: projector.id,
        serialNumber: projector.serialNumber,
        status: projector.status,
        projectorModel: projector.projectorModel,
        audis: projector.audis,
      },
      totals: {
        totalRmaCount,
      },
      breakdown: {
        byStatus: (byStatus as any[]).map((row) => ({ status: row.status, count: row._count || row._count?.status || 0 })),
        byType: (byType as any[]).map((row) => ({ rmaType: row.rmaType, count: row._count || row._count?.rmaType || 0 })),
        byPart: partCounts,
      },
      recentRmas,
      suggestions,
    });
  } catch (error: any) {
    console.error('Insights projector analytics error:', error);
    return sendError(res, 'Failed to fetch projector analytics', 500, error.message);
  }
}

