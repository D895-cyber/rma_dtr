/**
 * Part Name Normalization Utility
 * 
 * Normalizes part names to handle variations like:
 * - "Light Engine" vs "light engine" vs "LE" vs "LightEngine"
 * - Case insensitivity
 * - Whitespace variations
 * - Common abbreviations
 */

import { prisma } from './prisma.util';

// Common part name mappings (can be extended via database)
const DEFAULT_PART_NAME_MAPPINGS: Record<string, string> = {
  // Light Engine variations
  'le': 'Light Engine',
  'lightengine': 'Light Engine',
  'light engine': 'Light Engine',
  'light-engine': 'Light Engine',
  'light_engine': 'Light Engine',
  
  // Lamp variations
  'lamp': 'Lamp',
  'bulb': 'Lamp',
  'light bulb': 'Lamp',
  
  // Lens variations
  'lens': 'Lens',
  'optical lens': 'Lens',
  
  // Filter variations
  'filter': 'Filter',
  'air filter': 'Filter',
  'dust filter': 'Filter',
  
  // Board variations
  'board': 'Board',
  'pcb': 'Board',
  'printed circuit board': 'Board',
  'circuit board': 'Board',
  'main board': 'Board',
  'control board': 'Board',
  
  // Power Supply variations
  'psu': 'Power Supply',
  'power supply': 'Power Supply',
  'power supply unit': 'Power Supply',
  'ps': 'Power Supply',
  
  // Color Wheel variations
  'cw': 'Color Wheel',
  'color wheel': 'Color Wheel',
  'colour wheel': 'Color Wheel',
  
  // DMD variations
  'dmd': 'DMD',
  'digital micromirror device': 'DMD',
  'micromirror': 'DMD',
  
  // Fan variations
  'fan': 'Fan',
  'cooling fan': 'Fan',
  'exhaust fan': 'Fan',
};

// Cache to track if the part_name_aliases table exists
let tableExistsCache: boolean | null = null;
let tableCheckPromise: Promise<boolean> | null = null;

/**
 * Check if the part_name_aliases table exists (cached)
 */
async function checkTableExists(): Promise<boolean> {
  // Return cached result if available
  if (tableExistsCache !== null) {
    return tableExistsCache;
  }

  // If a check is already in progress, wait for it
  if (tableCheckPromise) {
    return tableCheckPromise;
  }

  // Start a new check
  tableCheckPromise = (async () => {
    try {
      // Check information_schema first - this won't throw errors if table doesn't exist
      const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'part_name_aliases'
        ) as exists;
      `);
      
      const exists = result?.[0]?.exists === true;
      tableExistsCache = exists;
      return exists;
    } catch (error: any) {
      // Any error means table doesn't exist - silently handle
      tableExistsCache = false;
      return false;
    } finally {
      tableCheckPromise = null;
    }
  })();

  return tableCheckPromise;
}

/**
 * Normalizes a part name by:
 * 1. Trimming whitespace
 * 2. Converting to lowercase for comparison
 * 3. Looking up in database aliases first (if table exists), then default mappings
 * 4. Returning the canonical name
 */
export async function normalizePartName(partName: string | null | undefined): Promise<string | null> {
  if (!partName || typeof partName !== 'string') {
    return null;
  }

  // Trim and normalize whitespace
  const trimmed = partName.trim().replace(/\s+/g, ' ');
  
  if (!trimmed) {
    return null;
  }

  // Create a normalized key for lookup (lowercase, no special chars)
  const normalizedKey = trimmed
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // First, check database for custom aliases (only if table exists)
  const tableExists = await checkTableExists();
  if (tableExists) {
    try {
      const alias = await prisma.partNameAlias.findFirst({
        where: {
          OR: [
            { alias: { equals: normalizedKey, mode: 'insensitive' } },
            { alias: { equals: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { canonicalName: true },
      });

      if (alias) {
        return alias.canonicalName;
      }
    } catch (error: any) {
      // If database lookup fails (table might have been deleted), mark as non-existent and continue
      if (error.code === 'P2021' || error.code === '42P01' || error.message?.includes('does not exist')) {
        tableExistsCache = false;
      }
      // Silently continue to default mappings
    }
  }

  // Check default mappings
  if (DEFAULT_PART_NAME_MAPPINGS[normalizedKey]) {
    return DEFAULT_PART_NAME_MAPPINGS[normalizedKey];
  }

  // If no mapping found, return the trimmed original (capitalize first letter of each word)
  return capitalizeWords(trimmed);
}

/**
 * Capitalizes the first letter of each word
 */
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizes multiple part names at once (batch operation)
 */
export async function normalizePartNames(partNames: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(partNames.map(name => normalizePartName(name)));
}

/**
 * Gets all part name aliases from database
 */
export async function getAllPartNameAliases() {
  return prisma.partNameAlias.findMany({
    orderBy: { canonicalName: 'asc' },
  });
}

/**
 * Creates or updates a part name alias
 */
export async function upsertPartNameAlias(alias: string, canonicalName: string) {
  const normalizedAlias = alias.trim().toLowerCase();
  const normalizedCanonical = canonicalName.trim();

  return prisma.partNameAlias.upsert({
    where: {
      alias: normalizedAlias,
    },
    update: {
      canonicalName: normalizedCanonical,
    },
    create: {
      alias: normalizedAlias,
      canonicalName: normalizedCanonical,
    },
  });
}

/**
 * Deletes a part name alias
 */
export async function deletePartNameAlias(alias: string) {
  return prisma.partNameAlias.delete({
    where: {
      alias: alias.toLowerCase().trim(),
    },
  });
}
