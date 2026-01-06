import { prisma } from './prisma.util';

export interface AssignmentRule {
  id: string;
  name: string;
  caseType: 'DTR' | 'RMA';
  isActive: boolean;
  priority: number;
  conditions: any;
  assignTo: string | null;
  assignToRole: string | null;
}

/**
 * Find matching assignment rule for a case
 */
export async function findMatchingRule(
  caseType: 'DTR' | 'RMA',
  caseData: any
): Promise<AssignmentRule | null> {
  const rules = await prisma.assignmentRule.findMany({
    where: {
      caseType,
      isActive: true,
    },
    orderBy: { priority: 'desc' },
  });

  for (const rule of rules) {
    if (matchesConditions(rule.conditions, caseData)) {
      // Increment match count
      await prisma.assignmentRule.update({
        where: { id: rule.id },
        data: { matchCount: { increment: 1 } },
      });
      return rule as AssignmentRule;
    }
  }
  return null;
}

/**
 * Check if case data matches rule conditions
 */
function matchesConditions(conditions: any, caseData: any): boolean {
  if (!conditions || typeof conditions !== 'object') {
    return false;
  }

  for (const [key, value] of Object.entries(conditions)) {
    // Handle nested properties (e.g., site.siteName)
    const caseValue = getNestedValue(caseData, key);
    
    // Handle array conditions (e.g., severity: ['high', 'critical'])
    if (Array.isArray(value)) {
      if (!value.includes(caseValue)) {
        return false;
      }
    } else if (caseValue !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Get nested value from object (e.g., 'site.siteName' from { site: { siteName: 'X' } })
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Get assigned user based on rule
 */
export async function getAssignedUser(rule: AssignmentRule): Promise<string | null> {
  // Direct assignment
  if (rule.assignTo) {
    // Check if it's a special keyword
    if (rule.assignTo === 'round-robin') {
      return await getRoundRobinUser(rule.assignToRole || 'engineer');
    }
    if (rule.assignTo === 'least-busy') {
      return await getLeastBusyUser(rule.assignToRole || 'engineer', rule.caseType as 'DTR' | 'RMA');
    }
    // Direct user ID
    const user = await prisma.user.findUnique({
      where: { id: rule.assignTo, active: true },
    });
    return user ? user.id : null;
  }

  // Role-based assignment
  if (rule.assignToRole) {
    return await getLeastBusyUser(rule.assignToRole, rule.caseType as 'DTR' | 'RMA');
  }

  return null;
}

/**
 * Get user with least cases (round-robin for least busy)
 */
async function getLeastBusyUser(role: string, caseType: 'DTR' | 'RMA'): Promise<string | null> {
  const users = await prisma.user.findMany({
    where: { role: role as any, active: true },
  });

  if (users.length === 0) {
    return null;
  }

  // Count open cases per user
  const caseCounts = await Promise.all(
    users.map(async (user) => {
      let count = 0;
      if (caseType === 'DTR') {
        count = await prisma.dtrCase.count({
          where: {
            assignedTo: user.id,
            callStatus: { not: 'closed' },
          },
        });
      } else {
        count = await prisma.rmaCase.count({
          where: {
            assignedTo: user.id,
            status: { not: 'closed' },
          },
        });
      }
      return { userId: user.id, count };
    })
  );

  // Return user with least cases
  const leastBusy = caseCounts.reduce((min, curr) =>
    curr.count < min.count ? curr : min
  );

  return leastBusy.userId;
}

/**
 * Round-robin assignment (simple implementation - can be enhanced)
 */
async function getRoundRobinUser(role: string): Promise<string | null> {
  const users = await prisma.user.findMany({
    where: { role: role as any, active: true },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    return null;
  }

  // Simple round-robin: return first user (can be enhanced with state tracking)
  return users[0].id;
}

