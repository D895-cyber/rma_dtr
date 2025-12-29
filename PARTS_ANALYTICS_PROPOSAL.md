# Parts Analytics Enhancement Proposal

## Overview
Add comprehensive parts analytics to the Analytics section, focusing on month-wise and site-wise analysis with detailed drill-down capabilities.

---

## 1. **Parts Analytics Dashboard Section**

### 1.1 Main Metrics Cards (Top Row)
- **Total Parts Replaced** - Count of all replacement parts across all RMAs
- **Most Failed Part** - Part name with highest failure count
- **Average Replacement Time** - Days between error date and shipped date
- **DNR Rate** - Percentage of parts marked as "Do Not Return"
- **Parts by Category** - Breakdown by Lamp, Lens, Filter, Board, etc.

### 1.2 Time-Based Analysis (Monthly/Quarterly)
**Monthly Parts Failure Trend**
- Line chart showing defective parts count per month
- X-axis: Months (Jan 2024, Feb 2024, etc.)
- Y-axis: Number of defective parts
- Multiple lines for different part categories (optional toggle)
- Color-coded by part category

**Monthly Parts Replacement Trend**
- Bar chart showing replacement parts shipped per month
- Stacked bars by part category
- Shows both defective parts returned and replacement parts sent

**Parts Failure Rate Over Time**
- Percentage of RMAs involving parts vs. total RMAs
- Trend line showing if part failures are increasing/decreasing

### 1.3 Site-Wise Analysis
**Parts Failure by Site**
- Horizontal bar chart showing top 10 sites by part failure count
- Each bar shows site name and count
- Clickable bars to drill down to site details

**Site Parts Distribution**
- Pie chart showing parts distribution across sites
- Each slice represents a site
- Shows percentage and count

**Site Parts Heatmap**
- Grid view with sites as rows and part categories as columns
- Color intensity shows failure frequency
- Hover shows exact count

---

## 2. **Detailed Parts Breakdown**

### 2.1 Parts Failure Table
**Columns:**
- Part Name
- Part Number
- Category (Lamp, Lens, Filter, Board, etc.)
- Total Failures (count)
- Failure Rate (% of total)
- Most Common Site (where it fails most)
- Average Replacement Time (days)
- DNR Count (Do Not Return)
- Last Failure Date

**Features:**
- Sortable columns
- Search/filter by part name, number, or category
- Export to CSV
- Click on row to see detailed breakdown

### 2.2 Part Details Modal/Drill-Down
When clicking on a part or site, show:

**Part Details View:**
- Part information (name, number, category)
- Failure timeline (line chart)
- Site breakdown (which sites this part fails at)
- RMA cases list (all RMAs involving this part)
- Replacement parts used (if tracked)
- DNR reasons (if applicable)

**Site Details View:**
- Site name
- Total parts replaced at this site
- Parts breakdown by category (pie chart)
- Monthly trend for this site (line chart)
- Top failing parts at this site (bar chart)
- List of all RMAs at this site involving parts

---

## 3. **Filtering & Controls**

### 3.1 Date Range Filter
- Same date range picker as existing Analytics
- Apply to all parts charts and tables
- Default: Last 12 months

### 3.2 Part Category Filter
- Dropdown: All, Lamp, Lens, Filter, Board, Color Wheel, DMD, Other
- Filter all charts and tables by category

### 3.3 Site Filter
- Dropdown: All Sites, or select specific site
- When site selected, show site-specific analytics
- When "All Sites", show aggregate data

### 3.4 Part Name/Number Search
- Search box to find specific parts
- Real-time filtering of tables
- Highlight matching parts in charts

---

## 4. **Visualization Components**

### 4.1 Monthly Parts Failure Chart
**Type:** Line Chart or Area Chart
**Data Points:**
- X-axis: Months (formatted as "Jan 2024", "Feb 2024")
- Y-axis: Count of defective parts
- Multiple series: One line per part category (optional)
- Tooltip: Shows exact count, part names, site names

**Implementation:**
- Group RMA cases by month (using `rmaRaisedDate` or `customerErrorDate`)
- Count unique defective parts per month
- Option to toggle between "All Parts" and "By Category"

### 4.2 Site-Wise Parts Chart
**Type:** Horizontal Bar Chart
**Data Points:**
- Y-axis: Site names (top 10 or all)
- X-axis: Part failure count
- Color: Gradient or by category
- Tooltip: Shows part names, dates, counts

**Implementation:**
- Group RMA cases by site
- Count defective parts per site
- Sort by count (descending)
- Show top 10 with "View All" option

### 4.3 Parts Category Distribution
**Type:** Pie Chart or Donut Chart
**Data Points:**
- Each slice: Part category
- Size: Percentage of total failures
- Labels: Category name and count
- Colors: Distinct colors per category

**Implementation:**
- Group defective parts by category
- Count occurrences
- Calculate percentages
- Map categories to colors

### 4.4 Parts Failure Heatmap
**Type:** Grid/Heatmap
**Data Points:**
- Rows: Sites
- Columns: Part categories
- Cell color: Intensity based on failure count
- Tooltip: Site name, category, count

**Implementation:**
- Create matrix: Site × Category
- Count failures for each combination
- Normalize for color intensity
- Interactive: Click cell to see details

---

## 5. **Data Aggregation Logic**

### 5.1 Monthly Aggregation
```javascript
// Pseudo-code
For each RMA case:
  Extract month from rmaRaisedDate or customerErrorDate
  Extract defectivePartName and defectivePartNumber
  Group by month and part
  Count occurrences
```

### 5.2 Site Aggregation
```javascript
// Pseudo-code
For each RMA case:
  Extract siteName or site.siteName
  Extract defectivePartName and defectivePartNumber
  Group by site and part
  Count occurrences
```

### 5.3 Category Mapping
- Map `defectivePartName` to category using:
  - Exact match with Parts database (if linked)
  - Keyword matching (e.g., "Lamp" in name → Lamp category)
  - Manual mapping for common parts
  - Default: "Other" if no match

---

## 6. **User Experience Flow**

### 6.1 Navigation
1. User goes to Analytics section
2. New tab/section: "Parts Analytics"
3. Default view: Monthly trend + Site breakdown
4. User can:
   - Apply filters (date, site, category)
   - Click on chart elements to drill down
   - View detailed tables
   - Export data

### 6.2 Drill-Down Flow
**From Monthly Chart:**
- Click on a month → Show all parts failed that month
- Click on a part line → Show part details modal

**From Site Chart:**
- Click on a site bar → Show site details view
- Click on part in site view → Show part details

**From Parts Table:**
- Click on part row → Show part details modal
- Click on site name → Show site details view

### 6.3 Site Details View Layout
**Top Section:**
- Site name
- Total parts replaced
- Date range filter (specific to this site)

**Charts Section:**
- Monthly trend for this site (line chart)
- Parts by category (pie chart)
- Top failing parts (horizontal bar chart)

**Table Section:**
- All RMA cases at this site involving parts
- Columns: RMA Number, Date, Part Name, Part Number, Status, DNR

---

## 7. **Implementation Considerations**

### 7.1 Data Sources
- **Primary:** RMA cases (`rmaCases` from `useRMACases()`)
- **Fields to use:**
  - `defectivePartName` - Part name
  - `defectivePartNumber` - Part number
  - `defectivePartSerial` - Part serial (for unique tracking)
  - `replacedPartNumber` - Replacement part tracking
  - `siteName` or `site.siteName` - Site information
  - `rmaRaisedDate` or `customerErrorDate` - Date for time analysis
  - `isDefectivePartDNR` - DNR flag
  - `defectivePartDNRReason` - DNR reason

### 7.2 Category Detection
**Option 1:** Link to Parts database
- Match `defectivePartNumber` with `Part.partNumber`
- Use `Part.category` if match found

**Option 2:** Keyword-based mapping
- Create mapping: `{ "Lamp": ["lamp", "bulb"], "Lens": ["lens"], ... }`
- Check if part name contains keywords

**Option 3:** Manual category field
- Add `defectivePartCategory` to RMA form (future enhancement)
- For now, use Option 2

### 7.3 Performance Optimization
- Use `useMemo` for expensive calculations
- Cache aggregated data
- Lazy load detailed views
- Paginate large tables
- Virtual scrolling for long lists

### 7.4 Edge Cases
- Handle missing part names/numbers gracefully
- Show "Unknown" for uncategorized parts
- Handle sites with no part failures
- Handle months with no failures (show 0, not skip)
- Handle DNR parts separately in calculations

---

## 8. **Suggested UI Layout**

```
┌─────────────────────────────────────────────────────────┐
│  Parts Analytics                                        │
├─────────────────────────────────────────────────────────┤
│  [Date Range] [Site Filter ▼] [Category Filter ▼]      │
│  [Search Parts...]                                      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Total    │ │ Most     │ │ Avg      │ │ DNR       │ │
│  │ Replaced │ │ Failed   │ │ Replace  │ │ Rate      │ │
│  │ 1,234    │ │ Lamp     │ │ 5.2 days │ │ 12%       │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────┤
│  Monthly Parts Failure Trend                            │
│  [Line Chart: Months vs. Count]                         │
│  [Toggle: All / By Category]                           │
├─────────────────────────────────────────────────────────┤
│  Parts Failure by Site                                  │
│  [Horizontal Bar Chart: Top 10 Sites]                   │
│  [View All Sites]                                       │
├─────────────────────────────────────────────────────────┤
│  Parts by Category                                      │
│  [Pie Chart: Category Distribution]                    │
├─────────────────────────────────────────────────────────┤
│  Parts Failure Table                                    │
│  [Sortable Table with all parts]                        │
│  [Export CSV]                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 9. **Additional Features (Future Enhancements)**

### 9.1 Cost Analysis
- Track part costs (if available in Parts database)
- Calculate total cost of replacements
- Cost per site, per month
- Cost trends over time

### 9.2 Inventory Alerts
- Low stock warnings based on failure rates
- Reorder recommendations
- Parts that need restocking soon

### 9.3 Predictive Analytics
- Predict which parts will fail next
- Identify sites with increasing failure rates
- Forecast replacement needs

### 9.4 Comparison Views
- Compare parts across sites
- Compare months/quarters
- Compare part categories

### 9.5 Export & Reporting
- Export charts as images
- Export data as Excel/CSV
- Generate PDF reports
- Scheduled email reports

---

## 10. **Implementation Priority**

### Phase 1 (High Priority - Core Features)
1. Monthly parts failure trend chart
2. Site-wise parts breakdown chart
3. Parts failure table with basic filters
4. Part details modal (drill-down)

### Phase 2 (Medium Priority - Enhanced Features)
1. Site details view
2. Category-based filtering and charts
3. Parts category distribution (pie chart)
4. Enhanced filtering (search, category dropdown)

### Phase 3 (Low Priority - Advanced Features)
1. Heatmap visualization
2. Cost analysis (if cost data available)
3. Export functionality
4. Predictive analytics

---

## 11. **Technical Notes**

### 11.1 Data Processing
- Process RMA cases to extract part information
- Group by month, site, category
- Calculate aggregates (counts, percentages, averages)
- Handle missing/null values

### 11.2 Chart Libraries
- Use existing `recharts` library (already in use)
- Components: `LineChart`, `BarChart`, `PieChart`
- Responsive containers for mobile support

### 11.3 State Management
- Use React hooks (`useState`, `useMemo`, `useEffect`)
- Filter state: date range, site, category, search
- Cache filtered/aggregated data

### 11.4 Component Structure
```
Analytics.tsx
  └── PartsAnalytics.tsx (new component)
      ├── PartsMetricsCards.tsx
      ├── MonthlyPartsChart.tsx
      ├── SitePartsChart.tsx
      ├── PartsCategoryChart.tsx
      ├── PartsTable.tsx
      ├── PartDetailsModal.tsx
      └── SiteDetailsView.tsx
```

---

## Summary

This proposal adds comprehensive parts analytics with:
- ✅ Month-wise analysis (trends over time)
- ✅ Site-wise analysis (which sites have most part failures)
- ✅ Detailed drill-down (click to see specifics)
- ✅ Multiple visualizations (charts, tables, heatmaps)
- ✅ Filtering capabilities (date, site, category, search)
- ✅ User-friendly navigation and interactions

The implementation can be done incrementally, starting with core features and adding enhancements over time.





