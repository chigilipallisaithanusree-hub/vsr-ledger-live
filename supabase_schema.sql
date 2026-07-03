-- VSR Ledger: Complete Supabase PostgreSQL 15+ Schema
-- Copy and paste this script directly into the Supabase SQL Editor (https://supabase.com)

-- ==========================================
-- 1. EXTENSIONS & PREREQUISITES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CREATE MASTER TABLES
-- ==========================================

-- Table: profiles (Business Settings)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- FK to auth.users.id
    company_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) NOT NULL CONSTRAINT chk_gstin_len CHECK (char_length(gstin) = 15),
    bank_name VARCHAR(100) NOT NULL,
    bank_account VARCHAR(50) NOT NULL,
    bank_ifsc VARCHAR(11) NOT NULL CONSTRAINT chk_ifsc_len CHECK (char_length(bank_ifsc) = 11),
    upi_id VARCHAR(100),
    qr_code_url TEXT,
    company_logo_url TEXT,
    invoice_footer TEXT,
    terms_conditions TEXT,
    currency VARCHAR(5) DEFAULT '₹' NOT NULL,
    default_gst_rate DECIMAL(5,2) DEFAULT 18.00 NOT NULL CONSTRAINT chk_gst_positive CHECK (default_gst_rate >= 0),
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: buyers
CREATE TABLE IF NOT EXISTS public.buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15) CONSTRAINT chk_buyer_gstin CHECK (gstin IS NULL OR char_length(gstin) = 15),
    balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15) CONSTRAINT chk_supplier_gstin CHECK (gstin IS NULL OR char_length(gstin) = 15),
    outstanding_payable DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: materials (Material Catalog)
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    uom VARCHAR(20) DEFAULT 'Kgs' NOT NULL,
    default_purchase_rate DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_purchase_rate CHECK (default_purchase_rate >= 0),
    default_sales_rate DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_sales_rate CHECK (default_sales_rate >= 0),
    current_stock DECIMAL(12,3) DEFAULT 0.000 NOT NULL,
    minimum_threshold DECIMAL(12,3) CONSTRAINT chk_min_threshold CHECK (minimum_threshold IS NULL OR minimum_threshold >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- 3. CREATE CHRONOLOGICAL & FINANCIAL TABLES
-- ==========================================

-- Table: inventory_transactions (Stock Adjustment Logs)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    type VARCHAR(20) NOT NULL CONSTRAINT chk_trans_type CHECK (type IN ('add', 'remove', 'reconcile')),
    quantity DECIMAL(12,3) NOT NULL CONSTRAINT chk_trans_qty CHECK (quantity > 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: quotations
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(100) UNIQUE,
    buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE RESTRICT,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_quote_subtotal CHECK (subtotal >= 0),
    tax_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_quote_tax CHECK (tax_amount >= 0),
    total DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_quote_total CHECK (total >= 0),
    status VARCHAR(50) DEFAULT 'Draft' NOT NULL CONSTRAINT chk_quote_status CHECK (status IN ('Draft', 'Sent', 'Approved', 'Declined', 'Converted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: quotation_items
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    quantity DECIMAL(12,3) NOT NULL CONSTRAINT chk_qi_qty CHECK (quantity > 0),
    rate DECIMAL(15,2) NOT NULL CONSTRAINT chk_qi_rate CHECK (rate >= 0),
    amount DECIMAL(15,2) NOT NULL CONSTRAINT chk_qi_amt CHECK (amount >= 0)
);

-- Table: invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE,
    buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE RESTRICT,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_inv_subtotal CHECK (subtotal >= 0),
    tax_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_inv_tax CHECK (tax_amount >= 0),
    total DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_inv_total CHECK (total >= 0),
    paid_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CONSTRAINT chk_inv_paid CHECK (paid_amount >= 0),
    status VARCHAR(50) DEFAULT 'Unpaid' NOT NULL CONSTRAINT chk_inv_status CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid')),
    notes TEXT,
    transport JSONB, -- Stores global transportation details
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    quantity DECIMAL(12,3) NOT NULL CONSTRAINT chk_ii_qty CHECK (quantity > 0),
    rate DECIMAL(15,2) NOT NULL CONSTRAINT chk_ii_rate CHECK (rate >= 0),
    tax_rate DECIMAL(5,2) DEFAULT 18.00 NOT NULL CONSTRAINT chk_ii_tax_rate CHECK (tax_rate >= 0),
    subtotal DECIMAL(15,2) NOT NULL CONSTRAINT chk_ii_subtotal CHECK (subtotal >= 0),
    tax_amount DECIMAL(15,2) NOT NULL CONSTRAINT chk_ii_tax_amt CHECK (tax_amount >= 0),
    total DECIMAL(15,2) NOT NULL CONSTRAINT chk_ii_total CHECK (total >= 0),
    transportation_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL
);

-- Table: payments (Received Accounts Receivables)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CONSTRAINT chk_pay_amt CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CONSTRAINT chk_pay_method CHECK (payment_method IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque')),
    reference_number VARCHAR(100),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: buyer_ledger
CREATE TABLE IF NOT EXISTS public.buyer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    type VARCHAR(20) NOT NULL CONSTRAINT chk_bl_type CHECK (type IN ('invoice', 'payment', 'opening')),
    reference_id VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: supplier_ledger
CREATE TABLE IF NOT EXISTS public.supplier_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    type VARCHAR(20) NOT NULL CONSTRAINT chk_sl_type CHECK (type IN ('purchase', 'payment', 'opening')),
    reference_id VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: dashboard_notes
CREATE TABLE IF NOT EXISTS public.dashboard_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'General' NOT NULL CONSTRAINT chk_note_cat CHECK (category IN ('General', 'Invoice', 'Supplier', 'Stock', 'Reminder', 'Urgent', 'Inventory')),
    reminder_date DATE,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CONSTRAINT chk_notif_type CHECK (type IN ('low_stock', 'invoice_due', 'payment_reminder', 'quote_expiry')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' NOT NULL CONSTRAINT chk_notif_priority CHECK (priority IN ('low', 'medium', 'high')),
    related_id UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL CONSTRAINT chk_act_action CHECK (action IN ('Create', 'Update', 'Delete', 'Payment', 'Login', 'Logout', 'Settings', 'System Launch', 'Create Invoice', 'Log Payment')),
    module VARCHAR(50) NOT NULL CONSTRAINT chk_act_module CHECK (module IN ('Buyers', 'Suppliers', 'Inventory', 'Quotations', 'Invoices', 'Auth', 'Settings')),
    reference_id VARCHAR(100),
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: buyer_documents
CREATE TABLE IF NOT EXISTS public.buyer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL CONSTRAINT chk_bd_size CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: supplier_documents
CREATE TABLE IF NOT EXISTS public.supplier_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL CONSTRAINT chk_sd_size CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: invoice_attachments
CREATE TABLE IF NOT EXISTS public.invoice_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL CONSTRAINT chk_ia_size CHECK (file_size > 0),
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ==========================================
-- 4. DATABASE VIEWS
-- ==========================================

-- View: dashboard_kpi_summary
CREATE OR REPLACE VIEW public.dashboard_kpi_summary AS
SELECT
    COALESCE(SUM(total) FILTER (WHERE date = CURRENT_DATE), 0.00) AS sales_today,
    COALESCE(SUM(total) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)::date), 0.00) AS sales_this_month,
    (SELECT COALESCE(SUM(balance), 0.00) FROM public.buyers WHERE is_active = true) AS outstanding_receivables,
    (SELECT COALESCE(SUM(outstanding_payable), 0.00) FROM public.suppliers WHERE is_active = true) AS outstanding_payables,
    (SELECT COUNT(*) FROM public.materials WHERE current_stock < minimum_threshold) AS low_stock_count
FROM public.invoices;

-- View: sales_performance_report
CREATE OR REPLACE VIEW public.sales_performance_report AS
SELECT
    to_char(date, 'YYYY-MM') AS calendar_month,
    COUNT(id) AS invoices_count,
    SUM(subtotal) AS gross_revenue_before_tax,
    SUM(tax_amount) AS collections_gst_total,
    SUM(total) AS cumulative_invoice_revenue,
    SUM(paid_amount) AS collected_payments_total,
    (SUM(total) - SUM(paid_amount)) AS outstanding_dues_total
FROM public.invoices
GROUP BY calendar_month
ORDER BY calendar_month DESC;


-- ==========================================
-- 5. FUNCTIONS & AUTOMATION TRIGGERS
-- ==========================================

-- Function & Trigger: Automated Modification Timestamps
CREATE OR REPLACE FUNCTION touch_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION touch_updated_timestamp();


-- Function & Trigger: Auto-Increment Custom Document Numbers
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INT;
    prefix VARCHAR(10);
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := to_char(CURRENT_DATE, 'YYYY');
    
    IF TG_TABLE_NAME = 'invoices' THEN
        prefix := 'VSR-' || year_prefix || '-';
        SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num FROM public.invoices WHERE to_char(created_at, 'YYYY') = year_prefix;
        NEW.invoice_number := prefix || lpad(seq_num::text, 4, '0');
    ELSIF TG_TABLE_NAME = 'quotations' THEN
        prefix := 'QT-' || year_prefix || '-';
        SELECT COALESCE(COUNT(*), 0) + 1 INTO seq_num FROM public.quotations WHERE to_char(created_at, 'YYYY') = year_prefix;
        NEW.quote_number := prefix || lpad(seq_num::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_generate_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION generate_document_number();

CREATE TRIGGER trig_generate_quote_number
BEFORE INSERT ON public.quotations
FOR EACH ROW EXECUTE FUNCTION generate_document_number();


-- Function & Trigger: Automatic Inventory Adjustment on Invoice Creation
CREATE OR REPLACE FUNCTION adjust_stock_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Notice: invoice_items table rows are inserted separately for normalization.
    -- However, we can also hook on invoice_items insertions to deduct stock cleanly:
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hooking material catalog updates to actual invoice_items insert
CREATE OR REPLACE FUNCTION adjust_stock_on_invoice_item()
RETURNS TRIGGER AS $$
DECLARE
    inv_date DATE;
    inv_num VARCHAR(100);
BEGIN
    SELECT date, invoice_number INTO inv_date, inv_num FROM public.invoices WHERE id = NEW.invoice_id;

    -- Deduct from materials catalog stock count
    UPDATE public.materials 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.material_id;
    
    -- Append record to inventory ledger transaction log
    INSERT INTO public.inventory_transactions (material_id, date, type, quantity, description)
    VALUES (NEW.material_id, COALESCE(inv_date, CURRENT_DATE), 'remove', NEW.quantity, 'Dispatched for Invoice: ' || COALESCE(inv_num, 'INV-UNKNOWN'));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_adjust_stock_on_invoice_item
AFTER INSERT ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION adjust_stock_on_invoice_item();


-- Function & Trigger: Low Stock Alerts
CREATE OR REPLACE FUNCTION verify_material_thresholds()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock < NEW.minimum_threshold THEN
        -- Insert warning if not already warned today
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE type = 'low_stock' 
            AND related_id = NEW.id 
            AND is_read = FALSE
        ) THEN
            INSERT INTO public.notifications (type, title, description, priority, related_id)
            VALUES (
                'low_stock',
                'Low Stock Alert: ' || NEW.name,
                'Item stock is currently ' || NEW.current_stock || ' ' || NEW.uom || '. Safety limit is: ' || NEW.minimum_threshold,
                'high',
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_verify_material_thresholds
AFTER UPDATE OF current_stock ON public.materials
FOR EACH ROW EXECUTE FUNCTION verify_material_thresholds();


-- Function & Trigger: Invoice Payment Status & Running Buyer Ledger Updates
CREATE OR REPLACE FUNCTION process_payment_ledger_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    current_inv_balance DECIMAL(15,2);
    buyer_curr_balance DECIMAL(15,2);
    inv_num VARCHAR(100);
BEGIN
    -- 1. Deduct paid amount from the target Invoice
    UPDATE public.invoices
    SET paid_amount = paid_amount + NEW.amount
    WHERE id = NEW.invoice_id;
    
    -- Evaluate and update invoice payment status
    SELECT (total - paid_amount), invoice_number INTO current_inv_balance, inv_num FROM public.invoices WHERE id = NEW.invoice_id;
    
    IF current_inv_balance <= 0 THEN
        UPDATE public.invoices SET status = 'Paid' WHERE id = NEW.invoice_id;
    ELSE
        UPDATE public.invoices SET status = 'Partially Paid' WHERE id = NEW.invoice_id;
    END IF;
    
    -- 2. Deduct amount from buyer's general accounts receivable balance
    UPDATE public.buyers
    SET balance = balance - NEW.amount
    WHERE id = NEW.buyer_id;
    
    -- 3. Append record to buyer's ledger log
    SELECT balance INTO buyer_curr_balance FROM public.buyers WHERE id = NEW.buyer_id;
    
    INSERT INTO public.buyer_ledger (buyer_id, date, type, reference_id, description, amount, balance_after)
    VALUES (
        NEW.buyer_id,
        NEW.date,
        'payment',
        NEW.id::text,
        'Received payment of ' || NEW.amount || ' using ' || NEW.payment_method || ' (Ref: ' || COALESCE(NEW.reference_number, 'N/A') || ') for Invoice: ' || COALESCE(inv_num, 'N/A'),
        -NEW.amount,
        buyer_curr_balance
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_process_payment_ledger_reconciliation
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION process_payment_ledger_reconciliation();


-- ==========================================
-- 6. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_buyers_balance ON public.buyers(balance DESC);
CREATE INDEX IF NOT EXISTS idx_materials_stock_alert ON public.materials(current_stock, minimum_threshold);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_buyer_ledger_buyer_id ON public.buyer_ledger(buyer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier_id ON public.supplier_ledger(supplier_id);


-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- Simple All Access policies for Authenticated Users (Secure Single Admin pattern)
CREATE POLICY "Admin full profile control" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full buyers control" ON public.buyers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full suppliers control" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full materials control" ON public.materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full inventory control" ON public.inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full quotations control" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full quotation_items control" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full invoices control" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full invoice_items control" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full payments control" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full buyer_ledger control" ON public.buyer_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full supplier_ledger control" ON public.supplier_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full dashboard_notes control" ON public.dashboard_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full notifications control" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full activity_logs control" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full buyer_documents control" ON public.buyer_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full supplier_documents control" ON public.supplier_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full invoice_attachments control" ON public.invoice_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial default settings profile so the App starts up seamlessly
-- Replace this with actual admin user auth UUID upon user signup/authentication
INSERT INTO public.profiles (
    id, company_name, address, phone, email, gstin, bank_name, bank_account, bank_ifsc, currency, default_gst_rate
) VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'VSR Enterprises', 
    'Plot No. 12, Industrial Area, Sector 4, Gandhinagar, Gujarat, India - 382010', 
    '+91 98765 43210', 
    'owner@vsrledger.com', 
    '24AAACV1234A1Z5', 
    'State Bank of India', 
    '300412891223', 
    'SBIN0001043', 
    '₹', 
    18.00
) ON CONFLICT (id) DO NOTHING;
