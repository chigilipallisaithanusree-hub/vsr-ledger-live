# VSR Ledger — Implementation Plan (IP)

**Project Name:** VSR Ledger  
**Project Type:** Mobile-first Full Stack Business Ledger & Micro ERP  
**Frontend Platform:** Next.js / React, Tailwind CSS, Lucide Icons  
**Backend Platform:** Supabase (PostgreSQL, Auth, Storage)  
**Version:** 1.0.0  

---

## 1. Project Overview

### 1.1. Business Goal
VSR Ledger replaces manual paper books, ledger logs, and fragmented Excel worksheets with an elegant, responsive, single-user corporate workspace. The business goal is to empower a single Administrator (Business Owner) to perform commercial operations, monitor outstanding collections (receivables), track vendor liabilities (payables), manage material inventories, draft binding customer quotations, dispatch GST-compliant invoices, and retrieve real-time tax/profit statements from a unified mobile-first interface.

### 1.2. Technical Goal
Develop a secure, sub-second latency, full-stack application that leverages Serverless BaaS capabilities (Supabase) to handle persistent storage and authentication. The frontend relies on responsive Tailwind grids, elegant custom typography, and glassmorphic UI components, avoiding generic dashboards in favor of a Stripe-like, premium professional look.

### 1.3. Success Criteria
- **Zero-Trust Client Integrity:** Only the verified Admin session can execute database queries.
- **Accurate Financial Calculations:** Item totals, taxations, payments, and running balances are computed automatically and logged without rounding discrepancies.
- **Sub-Second Search Performance:** Material lookups, invoice searches, and ledger logs return results in under 300ms.
- **Responsive Fluidity:** 100% feature parity across viewports (Mobile, Tablet, Desktop).

---

## 2. Development Strategy

We recommend a **Backend-First + Feature-Modular Frontend** implementation strategy.

```
       +--------------------------------------------+
       |           Phase A: Backend Setup           |
       | (Postgres DDL, Foreign Keys, Triggers, RLS) |
       +--------------------------------------------+
                             |
                             v
       +--------------------------------------------+
       |           Phase B: Auth & Settings         |
       |  (Protected Context, Local Client Session) |
       +--------------------------------------------+
                             |
                             v
       +--------------------------------------------+
       |         Phase C: Master Catalogs           |
       |  (Buyers & Suppliers Ledger, Materials)    |
       +--------------------------------------------+
                             |
                             v
       +--------------------------------------------+
       |         Phase D: Financial Engine          |
       |   (Quotations, Invoices, Stock Updates)    |
       +--------------------------------------------+
                             |
                             v
       +--------------------------------------------+
       |         Phase E: Export & Reporting        |
       |   (PDFs, Excel Exports, Global Search)     |
       +--------------------------------------------+
```

### 2.1. Why Backend-First?
Developing PostgreSQL tables, indices, triggers, and security constraints first ensures that frontend forms submit into a structurally rigid database schema. Client-side state changes are simplified by relying on automated PostgreSQL database triggers (such as auto-deducting stock and updating running ledger balances).

### 2.2. Feature-Modular Frontend
The user interface is built on a modular, tab-based routing model. Each tab (e.g., Invoices, Materials, Reports) is treated as a self-contained feature component, isolated from other views to prevent merge conflicts and optimize bundle splitting.

---

## 3. Project Folder Structure

This workspace is designed to be highly maintainable, separating shared types, styling, assets, atomic UI elements, and core modules.

```
/vsr-ledger
├── /app                  # Next.js/React Page layout entry blocks
├── /assets               # Brand logos, placeholder avatars, and vectors
├── /components           # Core presentation components
│    ├── /ui              # Atomic layout elements (Buttons, Inputs, Dialogs)
│    └── NotesWidget.tsx  # Dynamic dashboard quick memo popup
├── /config               # API credentials and project settings
├── /features             # Complex modules bundled as single contexts
│    ├── /buyers          # Buyers listing, Ledger profile tables
│    ├── /suppliers       # Suppliers directory and payable logs
│    ├── /inventory       # Material catalogs and adjustment history
│    └── /invoices        # Tax Invoices form fields and details
├── /hooks                # Custom React state managers (useAuth, useLocalStorage)
├── /lib                  # Third-party initialized tools (Supabase clients, cn-merger)
├── /services             # Outbound connectors (WhatsApp sharing, PDF builders)
├── /styles               # Global CSS files and tailwind configuration scripts
├── /supabase             # Database schema files, triggers, and migrations
├── /types                # Shared types, interfaces, and enums
└── /utils                # Helper functions (Currency formatters, tax calculators)
```

---

## 4. Development Roadmap

The development process is broken down into structured, independent phases:

```
+---------------------------------------------------------------------------------------------------------+
|                                          DEVELOPMENT ROADMAP                                            |
|                                                                                                         |
| [P1: Setup] -> [P2: UI Foundations] -> [P3: Auth System] -> [P4: Dashboard KPIs] -> [P5: Master lists] |
|                                                                                                         |
|       [P10: Deployment] <- [P9: Reporting] <- [P8: Invoicing System] <- [P7: Inventory] <- [P6: Quotes] |
+---------------------------------------------------------------------------------------------------------+
```

### Phase 1: Project Setup & Supabase Bootstrap
- Setup Next.js template and run package installations.
- Establish the Supabase project container.
- Run database migrations (DDL tables, constraints, indices).
- Deploy storage buckets (`invoice-attachments`, `buyer-documents`, `supplier-documents`).

### Phase 2: UI Foundation & Typography
- Import Outfit, Plus Jakarta Sans, and JetBrains Mono fonts into index.css.
- Setup Tailwind color configuration variables mirroring the Matcha Cream/Milky Honey palette.
- Design the master layout shell: Left Sidebar (Desktop), Top Header, and Mobile Bottom Navigation bar.

### Phase 3: Single-User Authentication Wall
- Implement login page styled with a glassmorphic central card.
- Build protected route wrappers to prevent unauthenticated access.
- Deploy the email verification and reset password flows.

### Phase 4: Control Dashboard & Interactive Widgets
- Build the financial KPI cards with subtle hover elevations.
- Render the turnover sales performance SVG bar chart.
- Construct the floating Dashboard Notes Widget (Bottom sheet on mobile, Popover on desktop) and the notifications center.

### Phase 5: Buyers & Suppliers Ledger Modules
- Implement the search-active directory grids for Buyers and Suppliers.
- Construct the interactive sliding Profile Hub details drawer.
- Implement the chronological running ledger statement view.

### Phase 6: Material Stock Catalog
- Build the raw material category catalog listing default rates and UoMs.
- Build the item registration forms.

### Phase 7: Raw Material Inventory Manager
- Implement the Stock card grid with threshold warnings.
- Build the stock adjustments dialog box.

### Phase 8: Quotation Proposal Module
- Implement the dynamic item calculator form.
- Integrate the convert-to-invoice pipeline trigger.

### Phase 9: Invoicing and Billing System
- Deploy tax billing cards and forms.
- Configure PDF printing templates.
- Write the secure upload file bridge for attachments.
- Construct the WhatsApp quick-share messaging parser.

### Phase 10: Reports and Data Exporters
- Build comparative turnover, profit margin, and GST liability reports.
- Write the Excel and CSV table exports.

### Phase 11: Deployment & Production Verification
- Deploy to Vercel/Cloud Run.
- Configure production SSL certificates, custom domains, and rate limit rules.
- Execute post-deployment checks.

---

## 5. Detailed Task Breakdown

### Phase 1: Project Setup & Supabase Bootstrap
- **Objective:** Initialize the local repository, configure client dependencies, and set up the Supabase database.
- **Tasks:**
  1. Initialize Next.js / Vite React template with TypeScript support.
  2. Install core dependencies: `lucide-react`, `motion`, `recharts`, `@supabase/supabase-js`.
  3. Deploy PostgreSQL table definitions (as defined in the Backend Schema Document).
  4. Create indices for foreign keys and status columns.
  5. Deploy S3 private storage buckets.
- **Dependencies:** None.
- **Deliverables:** Working local project repo and active Supabase database container.
- **Completion Criteria:** Linter passes cleanly without type errors; `supabase` returns connection success.
- **Estimated Complexity:** Low.
- **Risk Level:** Low.

### Phase 5: Buyers & Suppliers Ledger Modules
- **Objective:** Create directories, form wizards, and interactive transaction ledgers for Buyers and Suppliers.
- **Tasks:**
  1. Build the list layout grid with real-time text filter searches.
  2. Implement the "+ Add Buyer" / "+ Add Supplier" form fields (incorporating tax checks like length-15 GSTIN).
  3. Create the profile details drawer layout.
  4. Build the horizontal tab controls: Contacts, Historical ledger, Files.
  5. Implement the chronological transaction table rendering calculated running balances.
- **Dependencies:** Phase 1, Phase 2.
- **Deliverables:** Directory screens and ledger statement calculators.
- **Completion Criteria:** Double-entry ledger calculates balance-after limits instantly; cards adapt correctly to screen size.
- **Estimated Complexity:** Medium.
- **Risk Level:** Low.

### Phase 9: Invoicing & Billing System
- **Objective:** Create the core billing system, including dynamic item calculators, auto-numbering, payment receipts, attachments, and sharing.
- **Tasks:**
  1. Build the draft invoice form (selecting buyers, adding materials, auto-calculating subtotals, tax rates, and grand totals).
  2. Configure browser print triggers styled with crisp print CSS parameters (`@media print`).
  3. Implement the payment entry modal to deduct balances from invoice totals.
  4. Connect S3 storage file upload inputs to process invoice attachments (receipt screenshots, delivery challans).
  5. Integrate the deep-link WhatsApp message template parser.
- **Dependencies:** Phase 1, Phase 5, Phase 7.
- **Deliverables:** Invoice form layouts, payment receipts, storage file binders, and WhatsApp sharing.
- **Completion Criteria:** Adding payment updates the invoice status to Paid; attachment uploads successfully upload to S3; WhatsApp launches deep-link URL on click.
- **Estimated Complexity:** High.
- **Risk Level:** Medium.

---

## 6. Implementation Ordering Matrices

To prevent compilation bottlenecks, follow these strict development orders:

### 6.1. Database Build Order
1. `profiles`
2. `buyers`
3. `buyer_documents`
4. `suppliers`
5. `supplier_documents`
6. `materials`
7. `inventory_transactions`
8. `quotations`
9. `quotation_items`
10. `invoices`
11. `invoice_items`
12. `payments`
13. `buyer_ledger`
14. `supplier_ledger`
15. `dashboard_notes`
16. `notifications`
17. `activity_logs`

*Reasoning:* Ensures that lookup and master tables are created first, so transactional tables can resolve their foreign key constraints (`ON DELETE CASCADE`, `ON DELETE RESTRICT`) correctly.

### 6.2. UI Build Order
1. **Master Layout Shell:** Navigation sidebar, top header, mobile footer navigation.
2. **Control Dashboard:** KPI cards, turnover charts, quick action menus.
3. **Master Catalogs:** Buyers list, suppliers list, material catalog, stock catalog.
4. **Transaction Forms:** Quotation builder, tax invoice designer.
5. **Ledger Audits:** Running balance ledger tables, chronological activity logs.
6. **Support Utilities:** Notes popup sheet, notification hub, global search panel.

---

## 7. Quality Assurance & Testing Checklist

Prior to production sign-off, verify the following:

- [ ] **Type Check Verification:** `tsc --noEmit` must build successfully.
- [ ] **Auth Safeguards:** Attempting to bypass the login wall via direct URLs must redirect the user to `/login`.
- [ ] **Math Calculation Audits:** Ensure that `subtotal * tax_rate` matches total invoice values with zero decimal drift.
- [ ] **Trigger Verification:** Adding an invoice must automatically decrease material quantities in the inventory catalog.
- [ ] **Storage Validation:** Uploading files larger than 10MB or of invalid mime-types must display clear error alerts.
- [ ] **WhatsApp Format Check:** Verify that generated WhatsApp link messages contain correct buyer data.
- [ ] **Print Layout Optimization:** Verify that printed invoices render properly on paper sheets, hiding navigation elements.
- [ ] **Mobile Touch Optimization:** Ensure all buttons have a minimum tap target of 44px.

---

## 8. Post-Deployment Checklist

Following a production release, run these operational tests:

1. **Production Sign-in:** Register and log in using the Admin profile.
2. **Catalog Onboarding:** Create a buyer, supplier, and catalog material.
3. **Inventory Intake:** Submit stock adjustment counts and verify that the updated quantity is displayed.
4. **Draft Quotation:** Create a draft proposal quotation.
5. **Invoice Dispatch:** Convert the quotation to a tax invoice. Verify that material stock has been decremented.
6. **Payment Settlement:** Record a partial payment and verify that the invoice status updates to Partially Paid and the buyer's outstanding balance decreases.
7. **File Attachment Audit:** Upload a receipt image, trigger the thumbnail preview, download the file, and delete it to verify the S3 file loop.
8. **Responsive UI Review:** Open Chrome DevTools and simulate various screens (e.g., iPhone 12, iPad Mini) to verify that cards, buttons, and drawers adjust correctly.
