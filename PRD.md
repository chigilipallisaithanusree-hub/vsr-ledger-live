# Product Requirements Document (PRD)

## Project Name: VSR Ledger
**Project Type:** Mobile-First, Full-Stack Micro ERP & Business Ledger Web Application  
**Author:** Senior Product Manager & Business Analyst  
**Target Audience:** Single Admin (Business Owner / Internal Operator)  
**Status:** Approved  
**Date:** July 1, 2026  

---

## 1. Executive Summary
VSR Ledger is a highly secure, private, mobile-first Micro ERP and business ledger system designed specifically for a single administrator (the Business Owner). It is built to replace manual, error-prone paper ledger books and fragmented spreadsheets (Excel/Google Sheets) with an integrated, cohesive digital platform. By centralizing daily operations—including cataloging, inventory tracking, buyer and supplier ledgers, quotation drafting, auto-calculating multi-currency invoicing, dynamic automated WhatsApp sharing, and multi-format document/receipt attachment management—VSR Ledger optimizes business processes, ensures ledger accuracy, improves receivable turnaround, and delivers comprehensive real-time financial reporting directly on a mobile or desktop interface.

---

## 2. Business Goals
- **Eliminate Paper and Spreadsheet Overhead:** Transition 100% of physical bookkeeping and manual offline spreadsheet logs to a single, secure cloud-accessible system.
- **Improve Cash Flow & Receivable Turnaround:** Accelerate payment collections through professional automated WhatsApp outreach, quick-payment links, and clear outstanding receivable aging reports.
- **Maximize Inventory & Operational Efficiency:** Provide real-time stock levels with automated warning triggers to prevent both stockouts of critical materials and excess capital lockup in surplus inventory.
- **Strengthen Auditability & Financial Control:** Record every single business activity (invoices, payments, catalog changes) in an immutable, comprehensive system log to guarantee accurate calculations of gross/net sales, GST liability, and profit margins.

---

## 3. Problem Statement
Many micro and small business owners manage operations using a combination of hand-written physical diaries and complex, disconnected Excel files. This fragmented approach suffers from several key flaws:
1. **Inefficient Collections:** Following up on outstanding dues requires manually reviewing multiple logs, manually composing text messages, and tracking down phone numbers, leading to delayed collections and poor cash flow.
2. **Operational Mistakes:** Manual arithmetic in invoices often leads to calculation errors in tax (GST), line-item extensions, and outstanding balances.
3. **No Real-Time Visibility:** Calculating monthly profits, material usage, tax obligations, and stock levels requires manual synthesis, which is tedious and rarely done in real-time.
4. **Data Loss & Dispersal:** Critical documents such as signed delivery challans, material receipts, and payment screenshots are stored in mismatched physical files or chaotic phone galleries, making them hard to retrieve during audits or disputes.

---

## 4. Target Users
* **Primary Actor:** Single Admin (The Business Owner / Operator).
* **Persona Attributes:** Busy, highly mobile, requires a frictionless experience optimized for one-handed operation on a smartphone. Values high readability, fast entry forms, structural layout efficiency, and lightning-fast global searches over complex multi-step navigation.

---

## 5. Functional Requirements

### 5.1. Authentication & Session Management
* **Admin Login:** Secured login screen requesting username/email and a secure password.
* **Forgot Password:** Self-service password recovery flow sending a secure reset link to the registered admin email.
* **Session Management:** Secure JWT or session-cookie based state. Auto-timeout of sessions after 7 days of inactivity. Persistent "Remember Me" option.
* **Private System Enforcer:** Hard redirect to the login page for any unauthenticated traffic attempting to access interior routes.

### 5.2. Dashboard & Notes Widget
* **Financial Summary Cards:** Real-time KPI blocks displaying:
  * *Today's Sales* (Gross value of invoices generated today).
  * *Monthly Sales* (Current month-to-date sales aggregate with percent change compared to the previous month).
  * *Outstanding Receivables* (Sum of unpaid and partially paid buyer invoices).
  * *Outstanding Payables* (Sum of unpaid and partially paid supplier balances).
* **Interactive Charts:** 
  * A dual-line/bar chart displaying *Monthly Sales vs. Monthly Expenses/Purchases*.
  * A donut chart illustrating *Revenue Share by Material Category*.
* **Recent Activity Feed:** Scrollable list of the last 10 system actions (e.g., "Invoice #INV-2026-004 created", "Payment of $1,200 received from Buyer X").
* **Quick Actions Panel:** Tap-optimized floating buttons to "Create Invoice", "Create Quote", "Add Buyer", "Add Material", and "Log Payment".
* **Dashboard Notes Widget:** A compact widget accessible from the main view that behaves as a responsive bottom sheet on mobile and a focused modal/popup on desktop. It supports:
  * *Add Note:* Create rich-text notes with optional categorization.
  * *Edit / Delete Note:* Full inline updates and safe-delete with confirmation.
  * *Pin Note:* Pin critical notes to the top of the widget with visual highlight indicators.
  * *Reminder:* Set a specific date/time trigger; notes approaching reminder times display a pulse animation.
  * *Categories:* Color-coded tags (e.g., General, Follow-up, Order, Billing).
  * *Search:* Real-time filter matching text contents.
  * *Mark Complete:* Mark active notes as resolved (archives them from the active list).

### 5.3. Buyer Management
* **Buyer Directory:** A searchable and filterable list of all registered business customers, displaying the company name, primary contact, outstanding balance, and active status.
* **Buyer Profile:** A dedicated hub displaying:
  * *Demographics & Contact Details:* Addresses, phone numbers, email, GSTIN (GST identification number).
  * *Interactive Ledger:* A chronologically sorted running-balance ledger showing invoices (debits) and payments (credits).
  * *Documents Vault:* Dedicated tab to upload, store, and view contracts, agreements, and specific buyer profiles.

### 5.4. Supplier Management
* **Supplier Directory:** Grid or list view of suppliers with key metadata: company name, primary contact, total purchased amount, and outstanding payables.
* **Supplier Ledger:** Running-balance ledger showing purchase entries, material intake logs, cash/bank payments, and current outstanding liability.
* **Outstanding Payables Tracker:** Aging breakdown of unpaid invoices to suppliers (0-30 days, 31-60 days, 60+ days) to help prioritize payments.

### 5.5. Material Catalog
* **Material List:** Global repository of raw materials, parts, and finished products used in business transactions.
* **Units of Measure (UoM):** Support for custom units (e.g., kg, tonnes, meters, pieces, bags).
* **Material Categories:** Hierarchy tags (e.g., Metals, Plastics, Packaging, Finished Goods).
* **Default Rates:** Customizable baseline purchase and sales rates per unit to pre-fill invoice and quotation line-items.

### 5.6. Raw Material Inventory Management
* **Stock Operations:**
  * *Add Material:* Register new materials into stock with default UoM, category, and minimum threshold levels.
  * *Update Quantity:* Log adjustments (manual reconciliation, incoming supplier deliveries, production usage drafts).
  * *Edit/Delete Material:* Update metadata or completely remove materials with cascading checks (warns if the material is currently referenced in open quotations/invoices).
* **Stock List & Quantity Management:** Real-time list showing *On Hand Quantity*, *Reserved Quantity*, and *Available Quantity*.
* **Low Stock Alerts:** Automated visual warnings (amber/red badges) on the dashboard and stock screens when "On Hand Quantity" drops below the user-defined safety threshold.

### 5.7. Quotation Module
* **Create Quote:** Interface to select buyers, add line-items from the Material Catalog, apply custom unit rates, specify terms, and calculate totals.
* **Status Management:** Quotation state transitions: *Draft* -> *Sent* -> *Approved* -> *Declined* -> *Converted*.
* **Convert to Invoice:** Single-tap conversion which automatically duplicates the entire quotation structure into a new active Invoice, marking the quote status as *Converted* and linking the two documents.
* **PDF Utility:** Real-time high-fidelity PDF generation supporting styling presets, ready to download or share.

### 5.8. Invoice Module
* **Invoice Life Cycle:**
  * *Create Invoice:* Select buyer (pre-fills addresses/GST details), add multiple materials/items, and input individual terms.
  * *Auto Invoice Numbering:* Configurable custom sequential formats (e.g., `VSR-2026-0001`).
  * *Auto Calculations:* Instant, exact calculations of Line Item Totals, Subtotals, Discounts, Taxes (CGST, SGST, IGST), and Grand Totals.
  * *Edit / Delete / Duplicate:* Modify draft or unpaid invoices, delete with administrative confirmation, or duplicate to use as a template for recurring orders.
  * *Mark Paid / Add Payment:* Add multiple partial payments against a single invoice or mark it as fully paid. Updates the ledger immediately.
* **Print & PDF Generation:** Print-optimized CSS templates for thermal/inkjet physical printers and downloadable local PDF options.
* **WhatsApp Communication Engine:** 
  * "Send via WhatsApp" button that triggers a direct URL deep-link to the WhatsApp Web API (`https://wa.me/{phone}`) or native app.
  * Automatically pre-fills the recipient customer's phone number and inserts a professionally drafted dynamic message.
  * *Dynamic Text Template:*
    > "Dear **[Customer Name]**,  
    >   
    > Your invoice **[Invoice Number]** dated **[Invoice Date]** has been generated.  
    >   
    > **Total Amount:** [Currency Symbol][Total Amount]  
    > **Due Date:** [Due Date]  
    >   
    > Please find your detailed invoice document and make the payment using this link: **[Payment Link]**  
    >   
    > Thank you for your business!"
* **Invoice Attachments (Multi-Document Vault):** Direct file upload and drag-and-drop capability associated with each invoice record supporting image formats (JPEG, PNG) and PDF documents. Supported file attachments include:
  * Receipt Images
  * Delivery Challans
  * Signed Documents
  * Payment Screenshots
  * Material Photos
  * PDF Documents

### 5.9. Reports & Multi-Format Exports
* **Available Reports:**
  * *Sales Report:* Invoiced revenue aggregate over custom date ranges, broken down by buyer or item.
  * *Buyer Report:* Outstanding balance listings and aging analysis.
  * *Supplier Report:* Total procurement volume and outstanding dues.
  * *GST Report:* Segmented Tax computations (CGST, SGST, IGST) collected on sales vs. paid on procurement, ready for tax filing.
  * *Profit Report:* Revenue minus Material Cost of Goods Sold (COGS) to calculate exact Gross and Net Profit Margins.
  * *Material Usage Report:* Popularity index of materials sold and volume consumed.
* **Multi-Format Export Engine:** Single-click exports generating formatted, structured data files:
  * **PDF:** Stylized tabular executive sheets.
  * **Excel (.xlsx):** Auto-adjusted column widths and operational formulas.
  * **CSV:** Raw data rows for external imports.

### 5.10. Business Settings
* **Company Profile Setup:** Edit business name, logo, physical address, phone numbers, email, website, and bank details (bank name, account number, IFSC code) to be printed on invoices.
* **Tax Rules:** Configure default GST rates (e.g., 5%, 12%, 18%, 28%) and toggle tax-inclusive or tax-exclusive pricing.
* **System Settings:** Currency symbol configuration, default invoice terms & conditions, and default backup options.

### 5.11. Notification Center
* **Notification Feed:** Slide-out panel displaying actionable, real-time internal notifications:
  * Low stock alerts.
  * Invoices past their due date (Overdue).
  * System alerts (e.g., successful exports, database connection checks).

### 5.12. Global Search
* **Omnipresent Search Bar:** Located at the top of the interface. Matches queries across all business collections: Buyers, Suppliers, Materials, Invoices (by number or item), and Quotations. Clicking a search result routes the admin directly to the target record.

### 5.13. Activity Log
* **Audit Trail Grid:** A read-only, chronological list logging all system actions. Every log includes a timestamp, action type (Create, Update, Delete, Export), affected module (Invoice, Buyer, Inventory), and descriptive details (e.g., "Admin updated base rate for Material 'Steel Rod'").

### 5.14. Documents Manager
* **Central File Repository:** A centralized dashboard displaying every file uploaded across all Buyers, Suppliers, and Invoices. Allows filtering by file type, searching by file name or associated entity, downloading, and deleting files.

---

## 6. Non-Functional Requirements

### 6.1. Mobile-First Responsiveness & Design
* The layout must prioritize mobile touch targets (minimum 44px) and fit gracefully on standard smartphone screen widths (320px to 480px).
* Desktop layouts should expand comfortably into multi-column bento grids, taking advantage of wider viewports while maintaining consistent spacing and aesthetic integrity.

### 6.2. Performance & Loading Efficiency
* Initial load times under 2 seconds on standard 4G mobile networks.
* Utilize local caching and client-side state managers to enable instant searching, sorting, and tabular pagination.

### 6.3. Security & Data Protection
* Private application state: all app routes must require authentication.
* Robust validation on all forms to prevent SQL Injection and Cross-Site Scripting (XSS).
* High-contrast design to ensure readability in bright outdoor environments (e.g., active warehouse floors or transit yards).

### 6.4. Data Integrity & Backups
* Clean, unified database schema with clear foreign-key constraints (e.g., preventing deletion of a buyer who has active unpaid invoices).
* Local client storage backups or cloud export structures to prevent loss of critical transaction logs.

---

## 7. User Stories & Acceptance Criteria

### User Story 1: Admin Logging In & Security
> **As the** Business Owner  
> **I want to** log in with my secret credentials  
> **So that** my business's private financial data, buyer contacts, and ledgers remain secure and inaccessible to others.

#### Acceptance Criteria:
- Entering invalid credentials must display a clear, non-specific error message.
- Successful login must store a secure session token and route the user to the Dashboard.
- Accessing any internal URL (e.g., `/dashboard`, `/buyers`) without a valid session must immediately redirect the browser to the login page.

---

### User Story 2: Quick Invoice & WhatsApp Dispatch
> **As the** Business Owner  
> **I want to** instantly draft an invoice on my phone, save it, and send a pre-filled summary via WhatsApp  
> **So that** I can bill my customers in under 30 seconds and receive payments faster.

#### Acceptance Criteria:
- Selecting a buyer must auto-populate billing, address, and contact details.
- Adding raw materials from the catalog must automatically calculate row subtotals, apply relevant taxes, and compute the final grand total.
- Saving the invoice must generate a unique, sequential invoice number.
- Clicking "Send via WhatsApp" must launch a WhatsApp window pre-addressed to the buyer’s contact number, containing the formatted invoice message with invoice details, due date, and payment link.

---

### User Story 3: Stock Threshold Tracking
> **As the** Business Owner  
> **I want to** see low-stock warnings highlighted on my dashboard  
> **So that** I know exactly when to reorder raw materials from my suppliers before running out.

#### Acceptance Criteria:
- When a material's on-hand quantity drops below its minimum threshold, a warning indicator must appear on both the Inventory screen and the Dashboard.
- The Dashboard stock widget must list all materials currently below their minimum threshold for immediate reordering.

---

### User Story 4: Ledger Reconciliation
> **As the** Business Owner  
> **I want to** view a chronological ledger of debits and credits on a buyer's profile  
> **So that** I can resolve payment disputes instantly and see their exact outstanding balance.

#### Acceptance Criteria:
- The buyer's ledger must display a table listing all transactions (Invoices as debits, Payments as credits) sorted chronologically.
- A running-balance column must accurately show the outstanding amount after each transaction.
- The profile page must display the total cumulative unpaid balance in a bold, high-contrast, easily readable card.

---

## 8. Success Metrics
* **Time-to-Bill Reduction:** Average time to create and send an invoice to a customer drops below 45 seconds.
* **Days Sales Outstanding (DSO) Improvement:** Reduction in outstanding payment collection lag by at least 15% within the first quarter.
* **Calculation Accuracy:** Zero arithmetic errors reported in invoices, taxes, and ledger balances.
* **Stock Continuity:** Zero operational delays caused by unexpected stockouts of cataloged materials.

---

## 9. Risks & Mitigation Strategies

| Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Accidental Data Loss** | High | Low | Implement automated database backups and allow the admin to export all transaction lists to Excel/CSV files with a single click. |
| **Poor Connectivity** | Medium | Medium | Optimize the mobile web application for fast loading times and light asset sizes. Utilize client-side caching to keep existing logs readable offline. |
| **Authentication Breach** | High | Low | Enforce strong password requirements, secure session tokens, and set sessions to expire after 7 days of inactivity. |

---

## 10. Assumptions
1. The administrator has constant or semi-regular internet access on their smartphone to load the web-based ERP.
2. The customer's mobile numbers provided in the system are registered on WhatsApp for successful outbound messaging.
3. The business operates primarily under a standard single-admin organizational structure without the need for multi-user roles or permissions.

---

## 11. Future Scope
* **Automated Bank Feed Integration:** Connect with local business bank accounts to auto-reconcile incoming bank transfers with outstanding buyer invoices.
* **Bar-code & QR-code Scanning:** Utilize the mobile camera directly through the web application to scan incoming material shipments and instantly update stock counts.
* **Gemini AI Predictive Analysis:** Integrate a server-side AI model to analyze sales trends and suggest optimal reorder points based on historical buyer demand patterns.
* **Multi-User Role Permissions:** Introduce restricted access levels for warehouse staff or sales representatives while keeping core financial reports private to the owner.
