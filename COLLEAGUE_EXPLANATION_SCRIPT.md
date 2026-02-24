# CRM Explanation Script — For Colleague Walkthrough

Use this script when explaining the CRM to a colleague. Adapt timing and depth based on audience.

---

## 1. Opening (30 seconds)

> "This is our **Full-Stack CRM** for projector and cinema equipment service. It’s built around two main processes: **DTR** — Daily Trouble Reports — and **RMA** — Return Merchandise Authorization. So it’s really a service-support CRM for handling faults and returns on cinema equipment."

---

## 2. What Problem It Solves (1 minute)

> "The idea is to give us one place to:
> - Track down-time and faults at sites and auditoriums
> - Manage RMAs: when something needs to go back, get repaired, or get replaced
> - Keep sites, audis, projectors, models, and parts in one system
> - Give engineers and managers a clear view of what’s happening and what needs attention"

---

## 3. Tech Stack (1 minute)

> "**Frontend:** React 18 with TypeScript, Vite, Tailwind, and Radix UI.  
> **Backend:** Node.js and Express with TypeScript.  
> **Database:** PostgreSQL with Prisma ORM.  
> 
> We also use Cloudinary for attachments, Nodemailer for emails, and a Google Sheets sync so managers can push RMA/DTR data into spreadsheets.  
> It’s designed as a PWA so it can be installed and used on mobile in the field."

---

## 4. User Roles (45 seconds)

> "There are four roles:
> - **Staff** — basic access
> - **Engineer** — handles cases in the field
> - **Manager** — oversight, analytics, templates, Google Sheets sync
> - **Admin** — user management and full access
> 
> Access is role-based, so people only see what’s relevant to their job."

---

## 5. Main Modules — Quick Tour (3–4 minutes)

### Dashboard

> "The **Dashboard** gives a quick overview: counts of open DTRs and RMAs, severity, recent cases, and status.  
> Managers can sync RMA and DTR data to Google Sheets from here."

### DTR Cases (Daily Trouble Reports)

> "**DTR Cases** are for down-time incidents. Each case has:
> - Site and auditorium
> - Projector (model and serial)
> - Problem description and action taken
> - Status: open → in_progress → closed or escalated
> - Severity: low, medium, high, critical  
> 
> Cases can be assigned to engineers and we have filters and saved searches."

### RMA Cases (Return Merchandise Authorization)

> "**RMA Cases** handle returns and replacements. Types include:
> - RMA
> - SRMA
> - RMA_CL
> - Lamps  
> 
> Status flow: open → rma_raised_yet_to_deliver → faulty_in_transit_to_cds → closed (or cancelled).  
> We track defect details, replacement parts, shipping, tracking, and DNR (Do Not Return)."

### Master Data

> "**Master Data** is where we manage Sites, Audis, and Projectors.  
> Each projector has a serial, model, status, and installation info.  
> We also support projector transfers between sites and auditoriums."

### Models & Parts

> "**Models & Parts** is our catalog of projector models and parts.  
> Parts are linked to models (e.g., lamp, lens).  
> We have a PartNameAlias system to normalize part names across cases."

### Templates

> "**Templates** are reusable DTR and RMA templates so we don’t have to retype common patterns."

### User Management

> "**User Management** (admin only) is where we add, edit, and remove users and their roles."

---

## 6. Analytics (1 minute)

> "There are three analytics views:
> - **General Analytics** — trends, severity, engineer performance, site stats, top projectors by RMA  
> - **RMA Analytics** — status, defect patterns, part breakdown, site distribution, type breakdown  
> - **RMA Aging** — aging by threshold and repeat failures (by serial, part, site), with Excel export  
> 
> These give managers visibility into workload, hotspots, and repeat issues."

---

## 7. Handy Features (1 minute)

> "Some useful extras:
> - **Smart Search** — Ctrl+K to search cases and sites quickly  
> - **Field Mode** — simplified mobile UI for engineers on site  
> - **Notifications** — in-app and email when cases are assigned or updated  
> - **Activity Feed** — live log of case actions  
> - **Saved Searches** — save common filters  
> - **Assignment Rules** — auto-assign cases based on conditions  
> - **Attachments** — upload files to cases (Cloudinary)"

---

## 8. How to Run It (30 seconds)

> "To run it locally:
> 
> 1. `npm install` in the project root  
> 2. `cd backend && npm install`  
> 3. Configure `.env` with database URL and any API keys (Cloudinary, Google, etc.)  
> 4. `npx prisma migrate dev` in the backend  
> 5. Start frontend: `npm run dev`  
> 6. Start backend: `cd backend && npm run dev`  
> 
> The frontend runs on port 5173, backend on 3000 by default."

---

## 9. Closing Summary (20 seconds)

> "In short: it’s a projector service CRM that handles DTRs and RMAs, with master data, analytics, role-based access, and tools for engineers and managers. Any questions?"

---

## Quick Reference Card

| Module      | Purpose                                           |
|------------|---------------------------------------------------|
| Dashboard  | Overview, counts, Google Sheets sync              |
| DTR Cases  | Down-time reports (status, severity, assignment)  |
| RMA Cases  | Returns and replacements (types, shipping)        |
| Master Data| Sites, Audis, Projectors                          |
| Models & Parts | Model catalog, parts, aliases                 |
| Templates  | Reusable DTR/RMA templates                        |
| Users      | User management (admin)                           |
| Analytics  | General, RMA-specific, RMA aging                  |

---

*Adapt this script for 5–10 minute demos by cutting sections or going deeper on specific modules.*
