# RMA Part Analytics Feature Guide

## Overview
The RMA Part Analytics feature allows users to analyze RMA cases by date range and part information (name or number). It provides comprehensive analytics including counts, status breakdowns, defect patterns, trends over time, and export capabilities.

## Features

### 1. **Date Range Filtering**
- Select a "From Date" and "To Date" to filter RMA cases
- Automatically adjusts trend grouping:
  - **≤ 30 days**: Daily grouping
  - **31-90 days**: Weekly grouping
  - **> 90 days**: Monthly grouping

### 2. **Part Search**
- Search by part name or part number
- Searches across all part fields:
  - Product Part Number
  - Defective Part Number
  - Defective Part Name
  - Replaced Part Number
  - Product Name

### 3. **Analytics Dashboard**

#### Summary Cards
- **Total RMA Cases**: Total count of matching cases
- **Product Parts**: Count of cases with product part numbers
- **Defective Parts**: Count of cases with defective parts
- **Replaced Parts**: Count of cases with replaced parts

#### Visualizations
1. **Status Breakdown** (Pie Chart)
   - Distribution of RMA cases by status
   - Shows percentage and count for each status

2. **RMA Type Breakdown** (Bar Chart)
   - Distribution by RMA type (RMA, SRMA, RMA_CL, Lamps)

3. **Frequency Trend Over Time** (Line Chart)
   - Shows trend of RMA cases over the selected date range
   - Automatically groups by day/week/month based on range

4. **Top Defect Patterns** (Horizontal Bar Chart)
   - Top 10 most common defect patterns
   - Based on defect details, symptoms, or defective part names

5. **Top Sites by RMA Cases** (Bar Chart)
   - Top 10 sites with the most RMA cases
   - Helps identify problematic locations

#### Data Table
- Detailed table showing all matching RMA cases
- Columns:
  - RMA Number
  - Date
  - Product Part
  - Defective Part
  - Replaced Part
  - Status
  - Site

### 4. **Export Functionality**
- **Export CSV**: Downloads data as CSV file
- **Export Excel**: Downloads data as Excel file (.xlsx)
- Includes all case details in the export

## Usage

### Accessing RMA Analytics
1. Navigate to **"RMA Analytics"** from the main navigation menu
2. The feature requires `analytics:view` permission (available to all roles)

### Running an Analysis
1. **Select Date Range** (optional but recommended):
   - Choose "From Date" and "To Date"
   - At least one date filter is recommended for meaningful trends

2. **Enter Part Search** (optional):
   - Type a part name or part number
   - Searches across all part-related fields

3. **Click "Analyze"**:
   - The system fetches and processes matching RMA cases
   - Analytics are displayed in real-time

4. **View Results**:
   - Review summary cards for quick insights
   - Examine charts for visual analysis
   - Browse the detailed table for specific cases

5. **Export Data** (if needed):
   - Click "Export CSV" or "Export Excel"
   - Files are automatically downloaded with timestamp

## API Endpoint

### GET `/api/analytics/rma-parts`

**Query Parameters:**
- `fromDate` (optional): Start date (YYYY-MM-DD)
- `toDate` (optional): End date (YYYY-MM-DD)
- `partName` (optional): Part name to search
- `partNumber` (optional): Part number to search

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCount": 150,
      "dateRange": {
        "from": "2024-01-01",
        "to": "2024-12-31"
      },
      "partFilter": {
        "name": "PSU",
        "number": null
      }
    },
    "statusBreakdown": {
      "open": 20,
      "rma_raised_yet_to_deliver": 30,
      "faulty_in_transit_to_cds": 40,
      "closed": 60
    },
    "defectPatterns": [
      { "pattern": "Power supply failure", "count": 25 },
      { "pattern": "Display issues", "count": 15 }
    ],
    "trends": [
      { "date": "2024-01", "count": 10 },
      { "date": "2024-02", "count": 15 }
    ],
    "partBreakdown": {
      "productParts": 150,
      "defectiveParts": 120,
      "replacedParts": 100
    },
    "siteDistribution": [
      { "site": "Site A", "count": 30 },
      { "site": "Site B", "count": 25 }
    ],
    "typeBreakdown": {
      "RMA": 100,
      "SRMA": 30,
      "RMA_CL": 15,
      "Lamps": 5
    },
    "cases": [...]
  }
}
```

## Permissions

- **Required Permission**: `analytics:view`
- **Available to**: All roles (staff, engineer, manager, admin)

## Technical Details

### Backend Implementation
- **Controller**: `backend/src/controllers/analytics.controller.ts`
- **Route**: `backend/src/routes/analytics.routes.ts`
- **Function**: `getRmaPartAnalytics()`

### Frontend Implementation
- **Component**: `src/components/RMAAnalytics.tsx`
- **Navigation**: Added to `src/App.tsx` as "RMA Analytics" tab

### Dependencies
- **Charts**: `recharts` (already installed)
- **Export**: `xlsx` (already installed)

## Best Practices

1. **Date Range Selection**:
   - Use specific date ranges for better trend analysis
   - Avoid very large ranges (> 1 year) for performance

2. **Part Search**:
   - Use partial matches (e.g., "PSU" will match "PSU-001", "PSU-002")
   - Search is case-insensitive

3. **Export**:
   - Export data for offline analysis or reporting
   - Excel format preserves formatting better for complex data

4. **Performance**:
   - Large date ranges may take longer to process
   - Consider narrowing filters for faster results

## Troubleshooting

### No Data Returned
- Verify date range is correct
- Check if part search term exists in database
- Ensure at least one filter is applied

### Export Not Working
- Check browser download permissions
- Ensure `xlsx` package is installed
- Verify data exists before exporting

### Charts Not Displaying
- Check browser console for errors
- Verify `recharts` is installed
- Ensure data structure matches expected format

## Future Enhancements

Potential improvements:
- Advanced filtering (multiple parts, status filters)
- Comparison mode (compare two date ranges)
- Scheduled reports
- Email export functionality
- Custom chart configurations
- Part cost analysis integration



