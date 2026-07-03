# Technical Requirements Document (TRD)

**Project Name:** VSR Ledger  
**Project Type:** Mobile-first Full Stack Micro ERP & Business Ledger Web Application  
**Version:** 1.0.0  
**Target Audience:** Single Admin (Business Owner / Internal Operator)  
**System Class:** Private Enterprise Single-Tenant SaaS / ERP  

---

## 1. System Architecture

The VSR Ledger application is designed with a modern decoupled full-stack architecture optimized for high performance, ease of maintenance, extreme security, and a responsive mobile-first experience.

```
+-----------------------------------------------------------------------------+
|                                CLIENT LAYER                                 |
|                                                                             |
|   +-----------------------+   +-------------------+   +-----------------+   |
|   |   Tailwind UI Layer   |-->|   React Context   |-->|   Lucide Icons  |   |
|   +-----------------------+   +-------------------+   +-----------------+   |
|                                         |                                   |
+-----------------------------------------|-----------------------------------+
                                          | HTTPS / REST / WebSockets
                                          v
+-----------------------------------------------------------------------------+
|                                BACKEND LAYER                                |
|                                                                             |
|      +---------------------------------------------------------------+      |
|      |               Supabase BaaS / Serverless API                  |      |
|      |                                                               |      |
|      |  +--------------------+  +------------------+  +-----------+  |      |
|      |  | Supabase Auth      |  | REST / PostgREST |  | Storage   |  |      |
|      |  +--------------------+  +------------------+  +-----------+  |      |
|      |            |                      |                  |        |      |
|      +------------|----------------------|------------------|--------+      |
+-------------------|----------------------|------------------|---------------+
                    v                      v                  v
+-----------------------------------------------------------------------------+
|                             DATA & STORAGE LAYER                            |
|                                                                             |
|   +-------------------------------------+   +---------------------------+   |
|   |      PostgreSQL Database            |   |     Supabase Bucket       |   |
|   | (Row Level Security & WAL Enabled)  |   | (Attachments & Documents) |   |
|   +-------------------------------------+   +---------------------------+   |
+-----------------------------------------------------------------------------+
```

### 1.1. Client Architecture
- **Framework:** React 18+ with Vite as the build tool for near-instant compilation and optimized client bundling.
- **Styling:** Tailwind CSS (utility-first approach) coupled with standard CSS variables for easy branding customizability.
- **Component Model:** Strictly functional React components paired with hooks.
- **Routing:** React Router v6 or standard lightweight custom route-state handling (depending on SPA requirements), rendering a single-page application with smooth state-based transition slides.

### 1.2. Backend Architecture
- **Provider:** Supabase BaaS (Backend-as-a-Service).
- **API Engine:** PostgREST, exposing safe, instant HTTP REST endpoints directly on top of our database tables.
- **Edge Run times:** Supabase Edge Functions (Deno runtime) for custom server-side procedures (e.g., generating high-fidelity PDF binaries or processing WhatsApp messaging APIs).

### 1.3. Database Layer
- **Engine:** PostgreSQL 15+.
- **Access Pattern:** PostgREST on port 443 with Row-Level Security (RLS) fully enabled to strictly authorize requests based on JWT-contained authentication tokens.
- **Data Integrity:** Strict foreign key constraint actions (`ON DELETE RESTRICT` / `ON DELETE CASCADE`), domain checklists, unique constraints, and transaction rollback protection.

### 1.4. Storage Layer
- **Engine:** Supabase Storage (backed by S3).
- **Structure:** Segmented private buckets for receipts, delivery challans, invoices, and general profile files.
- **Interfacing:** JWT authorized signed URL generation with customizable token expirations (e.g., 15-minute access windows).

### 1.5. Authentication Flow
1. Admin submits email/username and password.
2. Supabase Auth validates credentials against PostgreSQL auth table schema, returning a signed JWT and refreshing token.
3. Client stores session state in localized, secure storage (secured cookie or local memory).
4. All downstream REST calls carry the JWT bearer token in the `Authorization` header.
5. Database engine evaluates the token inside RLS filters to permit or block operations.

### 1.6. API Layer
- **REST Endpoints:** Auto-generated via PostgREST.
- **Formats:** UTF-8 encoded JSON requests and responses.
- **Querying:** Support for advanced PG filtering queries (e.g., `?select=*,buyer(name)&outstanding_balance=gt.0`).

---

## 2. Frontend Architecture

### 2.1. Ideal Folder Structure
The UI workspace is modular, separating shared utilities, core layouts, visual panels, and types to protect codebase boundaries:

```
/src
├── /assets          # Global SVGs, custom branding graphics, and splash images
├── /components      # UI components, tables, buttons, and layouts
│   ├── /ui          # atomic components (Buttons, Input, Badges, Modals)
│   ├── BuyersManager.tsx
│   ├── SuppliersManager.tsx
│   ├── InvoicesManager.tsx
│   ├── QuotationsManager.tsx
│   └── NotesWidget.tsx
├── /hooks           # Custom React hooks (useAuth, useLocalStorage, useDebounce)
├── /services        # Supabase API clients and WhatsApp/PDF integration adapters
├── /types           # Strong TypeScript interfaces, enums, and utility types
├── App.tsx          # Main layout router and orchestrator
├── main.tsx         # Virtual DOM mount entry point
└── index.css        # Global CSS imports and tailwind configurations
```

### 2.2. Component Structure
Each component is structured to enforce single-responsibility logic:
- **Presentation Components:** Pure UI layout rendering, utilizing standard functional styling parameters.
- **Smart Container Components:** Handles fetching, mutating, local state modification, and interface interactions.
- **Atomic Components:** Standard visual elements (buttons, textboxes) built for accessibility and visual uniformity.

### 2.3. State Management
- **Local Form State:** Managed locally with standard React `useState` and `useReducer` to prevent global rendering bottlenecks.
- **Global Context Providers:** A single, lightweight React Context `BusinessContext` to store core active data (Buyers list, Suppliers list, Stock catalog, Settings parameters) so it is cached and shared instantly across all panels.
- **Persisted Local State:** Standard user settings cached securely on disk (`localStorage`) to guarantee faster app start times.

### 2.4. Routing & Tab State
- Tab navigation state is controlled via a centralized route-key enum (`"dashboard" | "buyers" | "suppliers" | "inventory" | "quotations" | "invoices" | "reports" | "settings" | "logs"`).
- Tab transitions use lightweight animations (Framer Motion) to slide views on mobile screens, providing a native app feel.

### 2.5. Form Validation
- Standard client-side verification utilizing HTML5 patterns combined with standard validation helper hooks.
- Every currency or count field enforces non-negative inputs, non-zero values on items, and exact character validation for GSTIN/IFS codes.

### 2.6. Loading and Error States
- **Skeleton Loaders:** Content boxes (tables, grids) display soft grey-pulse skeleton layout screens while fetch requests resolve.
- **Toasts:** Smooth, slide-in banners indicating action successes (e.g., "Invoice Saved Successfully") or failures.

---

## 3. Backend Architecture

VSR Ledger delegates standard operations directly to the Supabase BaaS, utilizing PostgreSQL capabilities to run advanced transactions securely.

```
                                    +-----------------------+
                                    |   Client App HTTP     |
                                    +-----------------------+
                                                |
                                                | HTTP REST / REST API
                                                v
                                    +-----------------------+
                                    |     API Gateway       |
                                    +-----------------------+
                                                |
                                                | Authorization: Bearer <JWT>
                                                v
                                    +-----------------------+
                                    |  Row Level Security   |  <--- Checks authenticated role
                                    +-----------------------+       and matches against Admin UUID
                                                |
                                                | Passes RLS Rules
                                                v
                                    +-----------------------+
                                    |      PostgreSQL       |
                                    +-----------------------+
```

### 3.1. Supabase Services
- **Auth Service:** Custom login, session verification, secure email verification, and recovery links.
- **Database Engine:** Managed cloud database with built-in pgAdmin configurations and real-time triggers.
- **Storage Engine:** S3-compatible cloud storage configured with custom pathing rules.

### 3.2. Row Level Security (RLS)
Since this is a single-owner system, all database tables apply a strict auth filter ensuring that only the verified Admin can modify or read database records.

Example RLS Rule:
```sql
-- Enforce single administrator privilege across all operational tables
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to single authenticated admin"
ON public.buyers
FOR ALL
TO authenticated
USING (auth.uid() = 'b8c8d8f8-e123-4567-a890-abcdef123456'); -- Target Single Admin UUID
```

### 3.3. API Structure & Business Logic
Most transactions happen natively via SQL triggers:
- **Quotation Converted Trigger:** Automatically reads the quotation, matches buyer and material item arrays, creates the invoice, decrements stock in the materials catalog, and updates the buyer ledger balance.
- **Invoice Deleted Trigger:** Automatically reverses outstanding balances in the buyer ledger and restores raw material quantities in the inventory catalog.

---

## 4. Database Strategy

The relational model utilizes PostgreSQL schema blocks to safeguard financial accounting data integrity.

```
  +-------------------+              +-------------------+
  |      buyers       |              |     suppliers     |
  +-------------------+              +-------------------+
  | id (PK)           |              | id (PK)           |
  | name              |              | name              |
  | balance           |              | outstanding       |
  +---------+---------+              +---------+---------+
            |                                  |
            | 1                                | 1
            |                                  |
            | M                                | M
  +---------v---------+              +---------v---------+
  |   buyer_ledger    |              |  supplier_ledger  |
  +-------------------+              +-------------------+
  | id (PK)           |              | id (PK)           |
  | buyer_id (FK)     |              | supplier_id (FK)  |
  | amount            |              | amount            |
  | balance_after     |              | balance_after     |
  +-------------------+              +-------------------+
```

### 4.1. Entity Relationship Schema (DDL)

#### Table: `profiles`
Tracks user settings and organizational properties.
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    gstin VARCHAR(15),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    bank_ifsc VARCHAR(11),
    currency VARCHAR(5) DEFAULT '₹',
    default_gst_rate DECIMAL(5,2) DEFAULT 18.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `buyers`
```sql
CREATE TABLE public.buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15),
    balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `suppliers`
```sql
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15),
    outstanding_payable DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `materials`
```sql
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    uom VARCHAR(20) NOT NULL,
    default_purchase_rate DECIMAL(15,2) DEFAULT 0.00,
    default_sales_rate DECIMAL(15,2) DEFAULT 0.00,
    current_stock DECIMAL(12,3) DEFAULT 0.000 NOT NULL,
    minimum_threshold DECIMAL(12,3) DEFAULT 0.000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `quotations`
```sql
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(100) UNIQUE NOT NULL,
    buyer_id UUID REFERENCES public.buyers(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    due_date DATE,
    items JSONB NOT NULL, -- Array of [{material_id, name, quantity, rate, amount}]
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Declined', 'Converted')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `invoices`
```sql
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    buyer_id UUID REFERENCES public.buyers(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    due_date DATE,
    items JSONB NOT NULL, -- Array of [{material_id, name, quantity, rate, tax_rate, subtotal, tax_amount, total}]
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(50) DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `buyer_ledger`
Running balance ledger tracking all buyer financial activities.
```sql
CREATE TABLE public.buyer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('invoice', 'payment', 'opening')),
    reference_id VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

#### Table: `invoice_attachments`
Tracks secure document uploads linked to individual invoices.
```sql
CREATE TABLE public.invoice_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Storage bucket path key
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 4.2. Database Optimization Indexes
To ensure instantaneous page loads even with thousands of records, we declare optimized indices:
```sql
CREATE INDEX idx_invoices_buyer ON public.invoices(buyer_id);
CREATE INDEX idx_buyer_ledger_buyer ON public.buyer_ledger(buyer_id, date DESC);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_quotations_buyer ON public.quotations(buyer_id);
```

---

## 5. File Storage Strategy

VSR Ledger manages multiple binary assets (signed delivery receipts, material specification photos, invoices, and payment proof screenshots).

### 5.1. Storage Buckets
The Supabase Storage environment is segregated into three dedicated private buckets:
1. `invoice-attachments`: Linked directly to files supporting corporate sales logs.
2. `buyer-documents`: Linked to contracts, KYC logs, and specific buyer properties.
3. `supplier-documents`: Linked to intake quality specifications and delivery documents.

### 5.2. File Validation and Restrictions
- **Maximum File Size:** Strictly capped at 10MB per upload.
- **Allowed MIME Types:** 
  - Images: `image/jpeg`, `image/png`, `image/webp`.
  - Documents: `application/pdf`, `text/plain`, `application/vnd.ms-excel` (CSV).
- **Client Sanitization:** Prior to transit, file titles are sanitized to lowercase alphanumeric strings with dashes, purging emojis and spacing characters to prevent URL parsing errors.

### 5.3. Security Rules
- All buckets are private. Anonymous public downloads are strictly forbidden.
- Signed URLs with brief TTL properties (900 seconds / 15 minutes) are fetched on-the-fly to serve preview thumbnails.

---

## 6. Security Requirements

Securing private ERP data against external intrusion is of paramount importance.

| Vector | Control Mechanism |
| :--- | :--- |
| **Authentication** | Dual-layered login using standard hashing routines with persistent JWT validations. |
| **Authorization** | Strict PostgreSQL Row-Level Security checks to match caller's verified UUID against database tables. |
| **Input Sanitization** | Automatic escaping of values via PostgREST to prevent SQL Injection, combined with standard component escaping to mitigate XSS risks. |
| **Rate Limiting** | Automated IP rate throttling (max 120 API calls/min) enforced at the API Gateway layer. |
| **Data Encryption** | Full AES-256 Bit Encryption-at-Rest for all database tables, combined with TLS 1.3 encryption for data in transit. |

---

## 7. Performance Requirements

VSR Ledger targets a highly optimized visual runtime to ensure seamless interaction:

- **Resource Bundle Splitting:** Uses dynamic imports (`React.lazy`) to partition large sub-modules (e.g., PDF creators or complex reporting engines) so they load only when required.
- **Render Optimization:** Heavy lists and matrices utilize virtualization (`react-window`) to efficiently render thousands of transaction logs without UI lagging.
- **Local Cache Strategy:** Key non-frequently-changing master lists (e.g., units of measure, material categories) are saved inside client memory state to bypass repetitive network requests.

---

## 8. Error Handling

A unified client-side error handling system is deployed to capture and display issues gracefully:

- **Database Errors:** Standard database errors (e.g., foreign key violations like "Cannot delete Buyer with open unpaid Invoices") are caught and mapped to clear, user-friendly Toast alerts.
- **Network Failures:** If connection is lost, the client transitions to a read-only state with visual alerts, queueing modifications in memory to re-sync when connection is restored.
- **Authentication Expiration:** On session timeout, the client auto-clears sensitive memory blocks and redirects the user to the login screen with a descriptive prompt.

---

## 9. Logging Strategy

Audit logs are recorded inside the database log table to track admin actions chronologically.

### Log Model Layout
Each transaction records:
- **ID:** Unique auto-generated key.
- **Timestamp:** Precise ISO-8601 server timestamp.
- **Action Type:** Enums (`Create`, `Update`, `Delete`, `Payment`, `System`).
- **Module Target:** Target entity tracking (`Buyers`, `Invoices`, `Stock`, `Settings`).
- **Details:** Human-readable text indicating the modified records and calculated parameters.

---

## 10. Third-Party Integrations

### 10.1. WhatsApp Communication Flow
The app integrates with WhatsApp by generating structured deep-link URLs to trigger WhatsApp's universal launch protocol:

```
https://wa.me/{country_code}{phone_number}?text={encoded_message}
```

#### Pre-formatted Message Payload Template:
```text
Greetings {Buyer Name},

We have generated tax invoice {Invoice Number} dated {Invoice Date} for your account.

Invoice Details:
----------------------------------------
Outstanding Amount: {Currency} {Amount Due}
Due Date: {Due Date}
----------------------------------------

Please utilize the payment link below to complete your remittance:
Payment Link: {Payment Link}

Sincerely,
{Company Name}
```

### 10.2. High-Fidelity Client-Side PDF Generation
- **Libraries:** Utilizes standard browser printing interfaces combined with custom CSS layouts (`@media print`) or specialized lightweight PDF libraries (`jspdf` or `pdfmake`) to compile professional, GST-compliant invoices and quotes on the fly.
- **Styling Specs:** Custom table styling with borders, tax breakdowns, and bank details sections optimized for crisp printing.

---

## 11. Deployment Architecture

### 11.1. Production Environments
- **Frontend App Host:** Vercel / Cloud Run (configured with secure custom domains).
- **Backend Services:** Supabase Cloud (AWS region closest to target users, e.g., ap-south-1).
- **Custom Domains:** Unified domain structure with HTTPS enforcing secure connections.

### 11.2. Required Secret Keys & Environment Properties
```env
# Client-side configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-side environment variables
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WHATSAPP_API_KEY=your_optional_whatsapp_gateway_key
```

---

## 12. Coding Standards

To ensure clean, safe, and maintainable TypeScript development:

- **Type Annotations:** Explicit typings on all variables, function arguments, and server response structures. Avoid utilizing the `any` keyword.
- **Naming Uniformity:** 
  - Database objects (tables, column names, constraints) use `snake_case`.
  - Frontend TypeScript properties, functions, and state variables use `camelCase`.
  - Component files and directories use `PascalCase`.
- **Pure Functions:** Business calculations (e.g., calculating GST, ledger balances, aging limits) are isolated in separate, unit-testability-friendly files.

---

## 13. Technical Assumptions

1. **Single-User Scope:** The platform operates on the absolute assumption that only one Admin access credential exists. Complex record locking and multi-user sync overhead are not implemented.
2. **Connectivity:** The application assumes a continuous, stable internet connection is available to retrieve cloud ledger logs.
3. **Database Engine:** Standard PostgreSQL functions are assumed to be supported, including raw JSONB data type processing and standard cryptographic hashing modules.
