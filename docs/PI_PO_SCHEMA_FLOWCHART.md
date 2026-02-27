# PI / PO & Warranty — Schema Flowchart

This document defines the **schema** (entities and relationships) for Proforma Invoice (PI), Purchase Order (PO), and Warranty/AMC flows.

---

## 1. Entity relationship diagram (schema overview)

```mermaid
erDiagram
    %% ========== EXISTING (relevant) ==========
    Site {
        uuid id PK
        string siteName
        string contactEmail "NEW - for sending PI"
        datetime createdAt
        datetime updatedAt
    }

    Projector {
        uuid id PK
        string serialNumber UK
        uuid projectorModelId FK
        string status
        date installationDate
        "NEW" date warrantyEndDate
        "NEW" string warrantyInvoiceNumber
        "NEW" date warrantyInvoiceDate
        "NEW" string clientPoNumber
        "NEW" string oemPoNumber
        datetime createdAt
        datetime updatedAt
    }

    ProjectorModel {
        uuid id PK
        string modelNo UK
        string manufacturer
        "NEW" decimal unitPrice "e.g. 125000 for CP2220"
    }

    Audi {
        uuid id PK
        string audiNo
        uuid siteId FK
        uuid projectorId FK
    }

    User {
        uuid id PK
        string name
        string email
    }

    %% ========== NEW ENTITIES ==========
    ProformaInvoice {
        uuid id PK
        string piNumber UK
        uuid siteId FK
        date piDate
        decimal amount
        enum status "draft | sent"
        datetime sentAt
        string sentToEmail
        uuid createdBy FK
        datetime createdAt
        datetime updatedAt
    }

    ProformaInvoiceLine {
        uuid id PK
        uuid proformaInvoiceId FK
        uuid projectorId FK
        decimal lineAmount
        string description
        int sortOrder
    }

    ClientPo {
        uuid id PK
        string poNumber UK
        uuid proformaInvoiceId FK
        date poDate
        string notes
        datetime createdAt
        datetime updatedAt
    }

    OemPo {
        uuid id PK
        string poNumber UK
        date poDate
        decimal amount
        enum status "draft | sent"
        datetime sentAt
        string sentToEmail
        uuid proformaInvoiceId FK "optional link to PI"
        uuid createdBy FK
        datetime createdAt
        datetime updatedAt
    }

    OemPoLine {
        uuid id PK
        uuid oemPoId FK
        uuid projectorId FK
        string description
        decimal lineAmount
        int sortOrder
    }

    %% ========== RELATIONSHIPS ==========
    Site ||--o{ Audi : "has"
    Site ||--o{ ProformaInvoice : "receives PI"
    Site ||--o{ DtrCase : "has"
    Site ||--o{ RmaCase : "has"

    ProjectorModel ||--o{ Projector : "model of"
    Projector ||--o{ Audi : "installed in"
    Projector ||--o{ ProformaInvoiceLine : "in PI line"
    Projector ||--o{ OemPoLine : "in OEM PO line"
    Projector ||--o{ ProjectorTransfer : "transfers"

    ProformaInvoice ||--o{ ProformaInvoiceLine : "contains"
    ProformaInvoice ||--o| ClientPo : "has client PO"
    ProformaInvoice }o--|| Site : "for site"
    ProformaInvoice }o--o| User : "created by"

    ClientPo }o--|| ProformaInvoice : "against PI"

    OemPo ||--o{ OemPoLine : "contains"
    OemPo }o--o| ProformaInvoice : "optional link to PI"
    OemPo }o--o| User : "created by"
```

---

## 2. Flow: Warranty/AMC → PI → Client PO → OEM PO

```mermaid
flowchart LR
    subgraph Master
        Site
        Projector["Projector\n(warranty fields)"]
    end

    subgraph PI_Flow["PI flow"]
        A[Expiring warranty list] --> B[Select projectors]
        B --> C[Create ProformaInvoice]
        C --> D[Add ProformaInvoiceLines]
        D --> E[Generate PI doc]
        E --> F[Send PI to Site]
        F --> G[Update PI: status=sent,\n sentAt, sentToEmail]
    end

    subgraph Client_PO["Client PO"]
        G --> H[Record ClientPo\nnumber, date]
        H --> I[Optional: send ack email]
    end

    subgraph OEM_PO["OEM PO"]
        I --> J[Create OemPo + lines]
        J --> K[Generate PO doc]
        K --> L[Send PO to OEM]
        L --> M[Update OemPo: status=sent,\n sentAt, sentToEmail]
    end

    subgraph Update_Coverage["Update projectors"]
        M --> N[Update Projector:\nwarrantyEndDate,\nwarrantyInvoice*, clientPoNumber,\noemPoNumber]
    end

    Site --> F
    Projector --> B
    Projector --> N
```

---

## 3. Schema summary (what to add)

| Area | Change |
|------|--------|
| **Site** | Add `contactEmail` (String?, for sending PI) |
| **ProjectorModel** | Add `unitPrice` (Decimal?, e.g. 125000 for CP2220 — price per unit for this model; used to default PI/PO line amounts) |
| **Projector** | Add `warrantyEndDate` (DateTime?), `warrantyInvoiceNumber` (String?), `warrantyInvoiceDate` (DateTime?), `clientPoNumber` (String?), `oemPoNumber` (String?) |
| **New: ProformaInvoice** | id, piNumber, siteId, piDate, amount, status (draft/sent), sentAt, sentToEmail, createdBy, timestamps |
| **New: ProformaInvoiceLine** | id, proformaInvoiceId, projectorId, lineAmount, description, sortOrder |
| **New: ClientPo** | id, poNumber, proformaInvoiceId, poDate, notes, timestamps |
| **New: OemPo** | id, poNumber, poDate, amount, status (draft/sent), sentAt, sentToEmail, proformaInvoiceId (optional), createdBy, timestamps |
| **New: OemPoLine** | id, oemPoId, projectorId, description, lineAmount, sortOrder |

---

## 4. Config (outside schema)

- **OEM recipient email**: e.g. `OEM_EMAIL` in env or a small `Settings` / config table (key-value for `oem_po_recipient_email`).

---

## 5. Model price → PI/PO line amount

- **ProjectorModel.unitPrice** is the default price per unit for that model (e.g. CP2220 = 1,25,000). Store as decimal (e.g. `125000`); display with locale formatting (e.g. 1,25,000).
- When adding a **ProformaInvoiceLine** or **OemPoLine** for a projector, default **lineAmount** from the projector’s **ProjectorModel.unitPrice**; user can override per line if needed.
- PI/PO document generation uses these line amounts to compute and show totals.

---

## 6. Optional: PI document template (reference)

- Stored as HTML template (file or DB); placeholders: `{{siteName}}`, `{{piNumber}}`, `{{piDate}}`, `{{lines}}`, `{{totalAmount}}`. Same idea for OEM PO template.

Use this flowchart as the single source of truth for the schema before implementing Phase 1 (Prisma changes + migration).
