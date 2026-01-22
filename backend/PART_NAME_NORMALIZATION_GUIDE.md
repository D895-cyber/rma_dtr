# Part Name Normalization System

## Overview

This system normalizes part names to handle variations like:
- "Light Engine" vs "light engine" vs "LE" vs "LightEngine"
- Case insensitivity
- Whitespace variations
- Common abbreviations

## Setup

### 1. Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_part_name_aliases
npx prisma generate
```

This will create the `part_name_aliases` table in your database.

### 2. Restart Your Server

After the migration, restart your backend server to load the new routes.

## API Endpoints

### Get All Aliases
```
GET /api/part-name-aliases
```
Returns all part name aliases configured in the system.

### Get Single Alias
```
GET /api/part-name-aliases/:id
```

### Create/Update Alias
```
POST /api/part-name-aliases
Body: {
  "alias": "le",
  "canonicalName": "Light Engine"
}
```

### Delete Alias
```
DELETE /api/part-name-aliases/:id
```

### Test Normalization
```
GET /api/part-name-aliases/test?partName=light engine
```
Returns the normalized version of a part name.

### Bulk Normalize
```
POST /api/part-name-aliases/bulk-normalize
Body: {
  "partNames": ["LE", "light engine", "LightEngine"]
}
```

## Default Mappings

The system comes with built-in mappings for common parts:

- **Light Engine**: "le", "lightengine", "light engine", "light-engine", "light_engine"
- **Lamp**: "lamp", "bulb", "light bulb"
- **Lens**: "lens", "optical lens"
- **Filter**: "filter", "air filter", "dust filter"
- **Board**: "board", "pcb", "printed circuit board", "circuit board", "main board", "control board"
- **Power Supply**: "psu", "power supply", "power supply unit", "ps"
- **Color Wheel**: "cw", "color wheel", "colour wheel"
- **DMD**: "dmd", "digital micromirror device", "micromirror"
- **Fan**: "fan", "cooling fan", "exhaust fan"

## Usage in Code

### Normalize a Single Part Name

```typescript
import { normalizePartName } from '../utils/partName.util';

const normalized = await normalizePartName("LE");
// Returns: "Light Engine"
```

### Normalize Multiple Part Names

```typescript
import { normalizePartNames } from '../utils/partName.util';

const normalized = await normalizePartNames(["LE", "light engine", "Lamp"]);
// Returns: ["Light Engine", "Light Engine", "Lamp"]
```

## Adding Custom Aliases

You can add custom aliases via the API or directly in the database:

```sql
INSERT INTO part_name_aliases (alias, canonical_name)
VALUES ('custom-alias', 'Canonical Part Name');
```

## Integration with Analytics

The normalization utility will be integrated into:
1. RMA Part Analytics - to group similar parts together
2. RMA Aging Calculator - to identify repeated failures of the same part

## Next Steps

1. Run the migration to create the table
2. Test the normalization with some sample part names
3. Add any custom aliases specific to your organization
4. The aging calculator will automatically use this normalization
