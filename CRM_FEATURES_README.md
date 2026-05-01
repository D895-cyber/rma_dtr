# Service CRM — Client Feature Guide

This document summarizes the capabilities of the **Service CRM** application (DTR & RMA workflows). You can share it with stakeholders as a **feature overview** for demos, onboarding, or procurement discussions.

---

## 1. What this product is

**Service CRM** is a web application for managing **field service and returns**:

- **DTR (Daily Trouble Report / service call)** — track on-site issues, status, assignment, and escalation.
- **RMA (Return Material Authorization)** — track return, shipping, replacement parts, and closure of material return cases.

The system is designed for **teams** (engineers, coordinators, admins) with **role-based access** and **real-time-style** updates for notifications and lists.

---

## 2. Who can use it (roles & access)

| Concept | Description |
|--------|-------------|
| **Authenticated users** | Sign-in required; actions are tied to the logged-in user. |
| **Roles (e.g. Admin, Staff)** | Menu items and data visibility depend on role and permissions. |
| **Staff-specific behavior** | Some users may see a **subset** of data (for example, PVR site scope for RMA) and **may not** see DTR modules, depending on configuration. |
| **Permissions** | Fine-grained flags (view/create/update) control access to DTR, RMA, analytics, master data, users, parts, models, etc. |

*Exact role names and permission matrices can be aligned with your organization during deployment.*

---

## 3. Core modules (what users see in the app)

### 3.1 Dashboard

- **Operational snapshot**: open/pending DTR and RMA indicators (where applicable).
- **Recent activity** and quick paths into common work (varies by role).
- **Field-friendly**: optional simplified **field mode** for mobile use.

### 3.2 DTR cases

- **List & search** DTR records with filters (status, severity, assignment, text search).
- **Create / view / edit** case details (site, audi/unit, problem, actions, remarks).
- **Workflow**: open, in progress, on hold, escalated, closed, cancelled (as implemented).
- **Assignment** to engineers or owners.
- **Audit trail** of changes (where enabled).
- **Templates** (for users with access): reusable structures to speed up DTR creation.

### 3.3 RMA cases

- **Full RMA lifecycle**: from raised through shipped, in transit, closed, or cancelled.
- **Rich case detail**: site, product, serials, defective/replacement parts, carriers, tracking, notes.
- **Statistics strip (KPI cards)** on the list view, for example:
  - Totals by status (open, pending, yet to deliver, in transit, closed).
  - **DNR (Do Not Return)** highlighting and filtering for defective parts marked DNR.
  - **DOA (Dead On Arrival)** count; **click to filter** cases explicitly marked DOA.
- **Filters**: status, type (RMA, CI RMA, Lamps, etc.), year, date range on RMA raised date, text search, **aging / overdue** style filters (e.g. shipped age buckets).
- **Pagination** over large datasets (server-driven).
- **Export** to spreadsheet formats for filtered or full-scope exports (where exposed in UI).
- **Per-case DOA decision**: suggested when a repeat RMA matches same projector + part within a configured window; user can **mark DOA** or **not DOA** with optional notes.
- **Email / docket** style actions where configured (e.g. client communication from case).

### 3.4 Analytics & reports

- **Cross-cutting analytics** (DTR + RMA where role allows):
  - Date range presets (last 7/30/90 days, year-to-date, all time).
  - Filters by **site** and **engineer**.
  - **KPI cards**: total DTR, total RMA, average shipping time, median return time (definitions shown on screen).
  - **Trends**: monthly / quarterly case volume charts.
  - **Overdue / monitoring** views for operational risk (e.g. long-open shipping or return scenarios).
  - **Export report** (CSV/Excel-style exports as implemented).
- **Dedicated RMA analytics** and **RMA aging** views for deeper operational and SLA-style insight.

### 3.5 Master data & catalog

- **Sites & Audis**: maintain locations and audi/projector linkage used by cases.
- **Projector models** catalog.
- **Parts** catalog for consistent part references across RMA and service data.

### 3.6 User administration

- **User management** (administrators): create/manage users and access aligned with your policy.

### 3.7 Notifications & collaboration

- **In-app notifications** for relevant events (assignments, status changes, etc., as configured).
- **Notification preferences** so users can tune what they receive.
- **Attachments** on cases: upload, list, and manage files tied to DTR/RMA (subject to storage configuration).

### 3.8 Productivity & UX

- **Global smart search** (keyboard shortcut) to jump to cases quickly.
- **Keyboard shortcut help** for power users.
- **Dark / light theme**.
- **PWA install** option for an app-like experience on supported devices.
- **Deep linking** via URL hash to main sections (e.g. bookmarkable areas of the app).

---

## 4. Data integrity & compliance-oriented features

- **Audit logs** on RMA (and related entities where implemented) for traceability of updates.
- **Server-side filtering and totals** so list counts and KPIs reflect the full dataset, not only the current page (where the API provides aggregates).

---

## 5. What to clarify with your implementation partner

When sharing this document with a client, align on:

1. **Hosting & URLs** — production domain, SSL, backup policy.  
2. **Identity** — SSO vs email/password, password policy, MFA.  
3. **Email** — SMTP/provider for notifications and RMA client emails.  
4. **File storage** — where attachments live (e.g. cloud object storage) and retention.  
5. **Scopes** — exact meaning of “staff” vs “admin” data visibility.  
6. **DOA / DNR rules** — business sign-off on windows, mandatory fields, and reporting definitions.  

---

## 6. Document maintenance

- **Audience**: client-facing feature summary (non-developer friendly).  
- **Source of truth**: the running application and your deployed configuration; this file is a **guide**, not a legal contract.  
- **Updates**: revise this README when major modules or workflows are added or renamed.

---

*Generated for the Service CRM codebase. Customize the product name, branding, and deployment details before external distribution.*
