import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { 
  Buyer, BuyerLedgerEntry, Supplier, SupplierLedgerEntry, 
  Material, StockAdjustment, Quotation, Invoice, DashboardNote, 
  BusinessSettings, ActivityLog, Payment, Attachment, UserSession, UserRole
} from "./src/types";

// Load environment configurations
dotenv.config();

const resolvedFilename = typeof import.meta?.url !== "undefined"
  ? fileURLToPath(import.meta.url)
  : (typeof __filename !== "undefined" ? __filename : "");
const resolvedDirname = typeof __dirname !== "undefined"
  ? __dirname
  : (resolvedFilename ? path.dirname(resolvedFilename) : "");

const app = express();
const PORT = 3000;

// Initialize Supabase Client if configured
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log("Supabase Client initialized with URL:", supabaseUrl);
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

// Track sync promise for middleware await to prevent race conditions on serverless environments
let syncPromise: Promise<any> = Promise.resolve();

// Helper to convert arbitrary short IDs (like b1, s1) to deterministic UUIDs for PostgreSQL foreign key integrity
const toUUID = (id: string): string => {
  if (!id) return "00000000-0000-0000-0000-000000000000";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id.toLowerCase();
  }
  
  // Create deterministic hash from non-UUID string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash).toString(16).padStart(8, "0");
  
  let cleanStr = id.replace(/[^a-f0-9]/ig, "").toLowerCase();
  if (cleanStr.length > 24) cleanStr = cleanStr.slice(0, 24);
  else cleanStr = cleanStr.padEnd(24, "0");
  
  const p1 = absHash;
  const p2 = cleanStr.slice(0, 4);
  const p3 = cleanStr.slice(4, 8);
  const p4 = cleanStr.slice(8, 12);
  const p5 = cleanStr.slice(12, 24);
  
  return `${p1}-${p2}-4${p3.slice(1)}-8${p4.slice(1)}-${p5}`;
};


// Enlarge body payload limit to support base64 invoice attachments and PDFs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware to serialize API request handling with background Supabase synchronizations
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/") && supabase) {
    try {
      await syncPromise;
    } catch (err) {
      console.error("Failed to await syncPromise in middleware:", err);
    }
  }
  next();
});

// Path to the persistent JSON database. Use /tmp on Vercel as root is read-only.
const DB_FILE = process.env.VERCEL
  ? path.join("/tmp", "db.json")
  : path.join(process.cwd(), "db.json");

// Define structure of the full database
interface DBStructure {
  session: UserSession;
  buyers: Buyer[];
  buyerLedger: BuyerLedgerEntry[];
  suppliers: Supplier[];
  supplierLedger: SupplierLedgerEntry[];
  materials: Material[];
  stockAdjustments: StockAdjustment[];
  quotations: Quotation[];
  invoices: Invoice[];
  notes: DashboardNote[];
  settings: BusinessSettings;
  logs: ActivityLog[];
}

// Initial default seed data to populate the DB on first start
const getInitialData = (): DBStructure => ({
  session: {
    username: "admin",
    role: UserRole.Admin,
    isLoggedIn: false
  },
  buyers: [
    { id: "b1", name: "Mahalaxmi Constructions", contactPerson: "Karan Shah", phone: "9876543210", email: "karan@mahalaxmi.com", address: "Sector 11, Plot 45, Gandhinagar, GJ", gstin: "24AAACM1029A1Z1", status: "active", balance: 82400 },
    { id: "b2", name: "Om Enterprise", contactPerson: "Dinesh Patel", phone: "9123456780", email: "dinesh@om.com", address: "GIDC Phase-2, Shed 104, Ahmedabad, GJ", gstin: "24ABCOP1120K2Z3", status: "active", balance: 12500 },
    { id: "b3", name: "Vertex Infra Group", contactPerson: "Sanjay Mehta", phone: "9988776655", email: "sanjay@vertex.in", address: "S.G. Highway, Shivalik Plaza, Ahmedabad, GJ", gstin: "24AAACV1234A1Z5", status: "active", balance: 215000 },
    { id: "b4", name: "R.K. Brothers", contactPerson: "Rajesh Kumar", phone: "9000111222", email: "info@rkbrothers.com", address: "Navrangpura, Nr. Post Office, Ahmedabad, GJ", gstin: "24ARKBR4401J1ZX", status: "active", balance: 0 }
  ],
  buyerLedger: [
    { id: "bl1", buyerId: "b1", date: "2026-06-15", type: "opening", referenceId: "opening", amount: 0, description: "Opening balance setup", balanceAfter: 0 },
    { id: "bl2", buyerId: "b1", date: "2026-06-22", type: "invoice", referenceId: "inv1", amount: 82400, description: "Invoice generated: VSR-2026-001", balanceAfter: 82400 },
    { id: "bl3", buyerId: "b2", date: "2026-06-23", type: "invoice", referenceId: "inv2", amount: 25000, description: "Invoice generated: VSR-2026-002", balanceAfter: 25000 },
    { id: "bl4", buyerId: "b2", date: "2026-06-23", type: "payment", referenceId: "p1", amount: 12500, description: "Partial payment received for VSR-2026-002", balanceAfter: 12500 },
    { id: "bl5", buyerId: "b3", date: "2026-06-24", type: "invoice", referenceId: "inv3", amount: 215000, description: "Invoice generated: VSR-2026-003", balanceAfter: 215000 },
    { id: "bl6", buyerId: "b4", date: "2026-06-24", type: "invoice", referenceId: "inv4", amount: 4200, description: "Invoice generated: VSR-2026-004", balanceAfter: 4200 },
    { id: "bl7", buyerId: "b4", date: "2026-06-25", type: "payment", referenceId: "p2", amount: 4200, description: "Full payment received for VSR-2026-004", balanceAfter: 0 }
  ],
  suppliers: [
    { id: "s1", name: "Apex Steel Industries", contactPerson: "Amit Goel", phone: "9876501234", email: "amit@apexsteel.com", address: "GIDC Industrial Estate, Kalol, GJ", gstin: "24AAPXS5501A2Z4", status: "active", outstandingPayable: 45000 },
    { id: "s2", name: "Gujarat Polymers", contactPerson: "Haresh Bhai", phone: "9426011223", email: "sales@gjpolymers.com", address: "Nadiad Bypass Rd, Kheda, GJ", gstin: "24AGJPL9012K3Z9", status: "active", outstandingPayable: 23400 },
    { id: "s3", name: "Vikas Chemical Corp", contactPerson: "Vikas Dubey", phone: "9898012345", email: "vikas@chemicalcorp.in", address: "Naroda GIDC, Ahmedabad, GJ", gstin: "24AVKCH4412B1Z2", status: "active", outstandingPayable: 17500 }
  ],
  supplierLedger: [
    { id: "sl1", supplierId: "s1", date: "2026-06-10", type: "opening", referenceId: "opening", amount: 0, description: "Opening balance setup", balanceAfter: 0 },
    { id: "sl2", supplierId: "s1", date: "2026-06-12", type: "purchase", referenceId: "pur1", amount: 45000, description: "Purchase order of Steel Rods", balanceAfter: 45000 },
    { id: "sl3", supplierId: "s2", date: "2026-06-18", type: "purchase", referenceId: "pur2", amount: 23400, description: "Purchase order of Industrial Primer", balanceAfter: 23400 },
    { id: "sl4", supplierId: "s3", date: "2026-06-20", type: "purchase", referenceId: "pur3", amount: 17500, description: "Purchase order of Fasteners", balanceAfter: 17500 }
  ],
  materials: [
    { id: "m1", name: "Aluminum Sheets (2mm)", sku: "AL-2MM-P", category: "Metals", unit: "sheets", defaultPurchaseRate: 1400, defaultSalesRate: 1850, minStockLevel: 50, currentStock: 12 },
    { id: "m2", name: "Steel Rods 10mm", sku: "SR-10MM-ST", category: "Metals", unit: "kg", defaultPurchaseRate: 60, defaultSalesRate: 85, minStockLevel: 100, currentStock: 45 },
    { id: "m3", name: "Industrial Primer", sku: "PNT-PRM-10L", category: "Chemicals", unit: "liters", defaultPurchaseRate: 320, defaultSalesRate: 450, minStockLevel: 20, currentStock: 4 },
    { id: "m4", name: "High-Tensile Bolts M12", sku: "BLT-M12-HT", category: "Fasteners", unit: "pieces", defaultPurchaseRate: 8, defaultSalesRate: 12, minStockLevel: 200, currentStock: 850 }
  ],
  stockAdjustments: [
    { id: "sa1", materialId: "m1", date: "2026-06-12", type: "add", quantity: 12, description: "Initial stock load from warehouse" },
    { id: "sa2", materialId: "m2", date: "2026-06-12", type: "add", quantity: 45, description: "Initial batch audit" },
    { id: "sa3", materialId: "m3", date: "2026-06-18", type: "add", quantity: 4, description: "Inward supply from Gujarat Polymers" },
    { id: "sa4", materialId: "m4", date: "2026-06-20", type: "add", quantity: 850, description: "Fastener batch load" }
  ],
  quotations: [
    {
      id: "q1",
      quoteNumber: "QT-2026-001",
      buyerId: "b1",
      date: "2026-06-20",
      dueDate: "2026-06-30",
      items: [
        { materialId: "m1", name: "Aluminum Sheets (2mm)", quantity: 40, rate: 1850, amount: 74000 },
        { materialId: "m4", name: "High-Tensile Bolts M12", quantity: 500, rate: 12, amount: 6000 }
      ],
      status: "converted",
      subtotal: 80000,
      taxAmount: 2400,
      total: 82400,
      convertedInvoiceId: "inv1",
      notes: "Standard commercial quote with 3% special contract rate."
    }
  ],
  invoices: [
    {
      id: "inv1",
      invoiceNumber: "VSR-2026-001",
      buyerId: "b1",
      date: "2026-06-22",
      items: [
        { materialId: "m1", name: "Aluminum Sheets (2mm)", quantity: 40, rate: 1850, amount: 74000 },
        { materialId: "m4", name: "High-Tensile Bolts M12", quantity: 500, rate: 12, amount: 6000 }
      ],
      status: "paid",
      subtotal: 80000,
      taxAmount: 2400,
      total: 82400,
      balanceDue: 0,
      payments: [
        { id: "pay1", date: "2026-06-22", amount: 82400, method: "UPI", referenceNo: "UPI9847291122", notes: "Full clearance payment" }
      ],
      attachments: [],
      notes: "Converted from quotation QT-2026-001"
    },
    {
      id: "inv2",
      invoiceNumber: "VSR-2026-002",
      buyerId: "b2",
      date: "2026-06-23",
      items: [
        { materialId: "m1", name: "Aluminum Sheets (2mm)", quantity: 10, rate: 1850, amount: 18500 },
        { materialId: "m4", name: "High-Tensile Bolts M12", quantity: 500, rate: 12, amount: 6000 }
      ],
      status: "partial",
      subtotal: 24500,
      taxAmount: 500,
      total: 25000,
      balanceDue: 12500,
      payments: [
        { id: "pay2", date: "2026-06-23", amount: 12500, method: "Cash", referenceNo: "CASH-REC-002", notes: "Advance payment received on site" }
      ],
      attachments: [],
      notes: "Standard delivery"
    },
    {
      id: "inv3",
      invoiceNumber: "VSR-2026-003",
      buyerId: "b3",
      date: "2026-06-24",
      items: [
        { materialId: "m1", name: "Aluminum Sheets (2mm)", quantity: 100, rate: 1850, amount: 185000 },
        { materialId: "m4", name: "High-Tensile Bolts M12", quantity: 2500, rate: 12, amount: 30000 }
      ],
      status: "unpaid",
      subtotal: 215000,
      taxAmount: 0,
      total: 215000,
      balanceDue: 215000,
      payments: [],
      attachments: [],
      notes: "Urgent shipment for SGD Highrise Site."
    },
    {
      id: "inv4",
      invoiceNumber: "VSR-2026-004",
      buyerId: "b4",
      date: "2026-06-24",
      items: [
        { materialId: "m2", name: "Steel Rods 10mm", quantity: 40, rate: 85, amount: 3400 },
        { materialId: "m4", name: "High-Tensile Bolts M12", quantity: 66, rate: 12, amount: 800 }
      ],
      status: "paid",
      subtotal: 4200,
      taxAmount: 0,
      total: 4200,
      balanceDue: 0,
      payments: [
        { id: "pay3", date: "2026-06-25", amount: 4200, method: "UPI", referenceNo: "UPI30029184", notes: "Payment verified" }
      ],
      attachments: [],
      notes: "Walk-in purchase counter sales."
    }
  ],
  notes: [
    { id: "n1", title: "Follow up with Vertex", content: "Call regarding overdue INV-2026-003 payment terms. Ask for 50% advance split.", isPinned: true, isCompleted: false, category: "Urgent", createdAt: "2026-06-30T10:00:00.000Z" },
    { id: "n2", title: "Stock Refill List", content: "Order aluminum sheets and primer by Friday. Check current metal rates from Apex Steel.", isPinned: true, isCompleted: false, category: "Inventory" as any, createdAt: "2026-06-30T11:00:00.000Z" }
  ],
  settings: {
    companyName: "Pavan Enterprises",
    logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDqjlC1GmAQ71cveIBWJUQbgaI23as2k9VstUR_Pbujx7Vf0kVtguzY04&s=10",
    address: "Plot No. 12, Industrial Area, Sector 4, Gandhinagar, Gujarat, India - 382010",
    phone: "+91 98765 43210",
    email: "owner@pavanledger.com",
    website: "www.pavanenterprises.in",
    bankName: "State Bank of India",
    bankAccount: "300412891223",
    bankIfsc: "SBIN0001043",
    gstIn: "24AAACV1234A1Z5",
    defaultGstRate: 18,
    currency: "₹"
  },
  logs: [
    { id: "l1", timestamp: "2026-06-30T09:12:00.000Z", action: "System Launch", module: "Auth", details: "Pavan Ledger engine rebooted successfully" },
    { id: "l2", timestamp: "2026-06-30T10:05:00.000Z", action: "Create Invoice", module: "Invoices", details: "Invoice VSR-2026-004 generated for R.K. Brothers - Amount ₹4,200.00" },
    { id: "l3", timestamp: "2026-06-30T11:22:00.000Z", action: "Log Payment", module: "Invoices", details: "Payment of ₹4,200.00 logged against invoice VSR-2026-004" }
  ]
});

// Pre-populate default materials if they are missing
const ensureDefaultMaterials = (database: DBStructure) => {
  const defaultMaterials = [
    { name: "20 mm", unit: "Tons", category: "Aggregates", purchase: 900, sales: 1200 },
    { name: "40 mm", unit: "Tons", category: "Aggregates", purchase: 950, sales: 1250 },
    { name: "Core Sand", unit: "Tons", category: "Sand", purchase: 800, sales: 1000 },
    { name: "Plastering Sand", unit: "Tons", category: "Sand", purchase: 850, sales: 1100 },
    { name: "Red Bricks (Karimnagar)", unit: "pieces", category: "Bricks", purchase: 7, sales: 9 },
    { name: "Red Bricks (Local)", unit: "pieces", category: "Bricks", purchase: 5, sales: 7 },
    { name: "Robosand", unit: "Tons", category: "Sand", purchase: 750, sales: 950 }
  ];

  if (!database.materials) {
    database.materials = [];
  }

  let modified = false;
  defaultMaterials.forEach(dm => {
    const exists = database.materials.some(
      m => m.name.trim().toLowerCase() === dm.name.trim().toLowerCase()
    );
    if (!exists) {
      const isBrick = dm.category === "Bricks";
      const cleanedName = dm.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const sku = `M-${cleanedName || "DEF"}`;
      database.materials.push({
        id: `m_def_${Math.random().toString(36).substr(2, 9)}`,
        name: dm.name,
        sku: sku,
        category: dm.category,
        unit: dm.unit,
        defaultPurchaseRate: dm.purchase,
        defaultSalesRate: dm.sales,
        minStockLevel: isBrick ? 500 : 50,
        currentStock: isBrick ? 10000 : 500
      });
      modified = true;
    }
  });

  if (modified) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save seeded materials to DB", err);
    }
  }
};

// Load DB helper
const loadDB = (): DBStructure => {
  try {
    let database: DBStructure;
    if (!fs.existsSync(DB_FILE)) {
      database = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), "utf-8");
    } else {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      database = JSON.parse(raw);
    }
    ensureDefaultMaterials(database);
    return database;
  } catch (err) {
    console.error("Error reading database file, returning default schema", err);
    const database = getInitialData();
    ensureDefaultMaterials(database);
    return database;
  }
};

// Async background synchronizer to replicate state into Supabase relational tables
const syncToSupabase = async (data: DBStructure) => {
  if (!supabase) return;
  
  try {
    // 1. Sync Settings (Profiles)
    if (data.settings) {
      const profileRow = {
        id: "00000000-0000-0000-0000-000000000000",
        company_name: data.settings.companyName || "VSR Enterprises",
        address: data.settings.address || "",
        phone: data.settings.phone || "",
        email: data.settings.email || "",
        gstin: data.settings.gstIn || "24AAACV1234A1Z5",
        bank_name: data.settings.bankName || "",
        bank_account: data.settings.bankAccount || "",
        bank_ifsc: data.settings.bankIfsc || "SBIN0001043",
        upi_id: data.settings.upiId || null,
        qr_code_url: data.settings.qrCodeUrl || null,
        company_logo_url: data.settings.logoUrl || null,
        invoice_footer: data.settings.invoiceFooter || null,
        terms_conditions: data.settings.termsConditions || null,
        currency: data.settings.currency || "₹",
        default_gst_rate: data.settings.defaultGstRate || 18.00,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from("profiles").upsert(profileRow);
      if (error) console.warn("Supabase Sync Warning (profiles):", error.message);
    }
    
    // 2. Sync Buyers
    if (data.buyers && data.buyers.length > 0) {
      const buyerRows = data.buyers.map(b => ({
        id: toUUID(b.id),
        name: b.name,
        contact_person: b.contactPerson || null,
        phone: b.phone || null,
        email: b.email || null,
        address: b.address || null,
        gstin: b.gstin || null,
        balance: b.balance || 0,
        is_active: b.status !== "inactive",
        created_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("buyers").upsert(buyerRows);
      if (error) console.warn("Supabase Sync Warning (buyers):", error.message);
    }
    
    // 3. Sync Suppliers
    if (data.suppliers && data.suppliers.length > 0) {
      const supplierRows = data.suppliers.map(s => ({
        id: toUUID(s.id),
        name: s.name,
        contact_person: s.contactPerson || null,
        phone: s.phone || null,
        email: s.email || null,
        address: s.address || null,
        gstin: s.gstin || null,
        outstanding_payable: s.outstandingPayable || 0,
        is_active: s.status !== "inactive",
        created_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("suppliers").upsert(supplierRows);
      if (error) console.warn("Supabase Sync Warning (suppliers):", error.message);
    }
    
    // 4. Sync Materials
    if (data.materials && data.materials.length > 0) {
      const materialRows = data.materials.map(m => ({
        id: toUUID(m.id),
        name: m.name,
        category: m.category || "General",
        uom: m.unit || "Kgs",
        default_purchase_rate: m.defaultPurchaseRate || 0,
        default_sales_rate: m.defaultSalesRate || 0,
        current_stock: m.currentStock || 0,
        minimum_threshold: m.minStockLevel || null,
        created_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("materials").upsert(materialRows);
      if (error) console.warn("Supabase Sync Warning (materials):", error.message);
    }
    
    // 5. Sync Notes (Dashboard Notes)
    if (data.notes && data.notes.length > 0) {
      const noteRows = data.notes.map(n => ({
        id: toUUID(n.id),
        title: n.title,
        description: n.content || "",
        category: n.category || "General",
        reminder_date: null,
        is_pinned: n.isPinned || false,
        is_completed: n.isCompleted || false,
        created_at: n.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("dashboard_notes").upsert(noteRows);
      if (error) console.warn("Supabase Sync Warning (dashboard_notes):", error.message);
    }
    
    // 6. Sync Logs (Activity Logs)
    if (data.logs && data.logs.length > 0) {
      const logRows = data.logs.map(l => ({
        id: toUUID(l.id),
        action: l.action,
        module: l.module,
        reference_id: l.referenceId || null,
        details: l.details || "",
        timestamp: l.timestamp || new Date().toISOString()
      }));
      const { error } = await supabase.from("activity_logs").upsert(logRows);
      if (error) console.warn("Supabase Sync Warning (activity_logs):", error.message);
    }
    
    // 7. Sync Buyer Ledger Entries
    if (data.buyerLedger && data.buyerLedger.length > 0) {
      const buyerLedgerRows = data.buyerLedger.map(bl => ({
        id: toUUID(bl.id),
        buyer_id: toUUID(bl.buyerId),
        date: bl.date || new Date().toISOString().split("T")[0],
        type: bl.type || "opening",
        reference_id: bl.referenceId || "opening",
        description: bl.description || "",
        amount: bl.amount || 0,
        balance_after: bl.balanceAfter || 0,
        created_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("buyer_ledger").upsert(buyerLedgerRows);
      if (error) console.warn("Supabase Sync Warning (buyer_ledger):", error.message);
    }
    
    // 8. Sync Supplier Ledger Entries
    if (data.supplierLedger && data.supplierLedger.length > 0) {
      const supplierLedgerRows = data.supplierLedger.map(sl => ({
        id: toUUID(sl.id),
        supplier_id: toUUID(sl.supplierId),
        date: sl.date || new Date().toISOString().split("T")[0],
        type: sl.type || "opening",
        reference_id: sl.referenceId || "opening",
        description: sl.description || "",
        amount: sl.amount || 0,
        balance_after: sl.balanceAfter || 0,
        created_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("supplier_ledger").upsert(supplierLedgerRows);
      if (error) console.warn("Supabase Sync Warning (supplier_ledger):", error.message);
    }
    
    // 9. Sync Quotations & Quotation Items
    if (data.quotations && data.quotations.length > 0) {
      const quoteRows = data.quotations.map(q => ({
        id: toUUID(q.id),
        quote_number: q.quoteNumber,
        buyer_id: toUUID(q.buyerId),
        date: q.date || new Date().toISOString().split("T")[0],
        due_date: q.dueDate || null,
        subtotal: q.subtotal || 0,
        tax_amount: q.taxAmount || 0,
        total: q.total || 0,
        status: q.status || "Draft",
        notes: q.notes || null,
        created_at: new Date().toISOString()
      }));
      
      const { error: qError } = await supabase.from("quotations").upsert(quoteRows);
      if (qError) {
        console.warn("Supabase Sync Warning (quotations):", qError.message);
      } else {
        // Upload quotation items
        const itemRows: any[] = [];
        data.quotations.forEach(q => {
          if (q.items && q.items.length > 0) {
            q.items.forEach((it, idx) => {
              itemRows.push({
                id: toUUID(`${q.id}_item_${idx}`),
                quotation_id: toUUID(q.id),
                material_id: toUUID(it.materialId),
                quantity: it.quantity || 1,
                rate: it.rate || 0,
                amount: it.amount || 0
              });
            });
          }
        });
        
        if (itemRows.length > 0) {
          const { error: qiError } = await supabase.from("quotation_items").upsert(itemRows);
          if (qiError) console.warn("Supabase Sync Warning (quotation_items):", qiError.message);
        }
      }
    }
    
    // 10. Sync Invoices, Invoice Items & Invoice Payments
    if (data.invoices && data.invoices.length > 0) {
      const invoiceRows = data.invoices.map(inv => ({
        id: toUUID(inv.id),
        invoice_number: inv.invoiceNumber,
        buyer_id: toUUID(inv.buyerId),
        date: inv.date || new Date().toISOString().split("T")[0],
        due_date: inv.dueDate || null,
        subtotal: inv.subtotal || 0,
        tax_amount: inv.taxAmount || 0,
        total: inv.total || 0,
        paid_amount: inv.total - (inv.balanceDue !== undefined ? inv.balanceDue : inv.total),
        status: inv.status === "paid" ? "Paid" : (inv.status === "partial" ? "Partially Paid" : "Unpaid"),
        notes: inv.notes || null,
        transport: inv.transport || null,
        created_at: new Date().toISOString()
      }));
      
      const { error: invError } = await supabase.from("invoices").upsert(invoiceRows);
      if (invError) {
        console.warn("Supabase Sync Warning (invoices):", invError.message);
      } else {
        // Upload invoice items & payments
        const itemRows: any[] = [];
        const paymentRows: any[] = [];
        
        data.invoices.forEach(inv => {
          if (inv.items && inv.items.length > 0) {
            inv.items.forEach((it, idx) => {
              itemRows.push({
                id: toUUID(`${inv.id}_item_${idx}`),
                invoice_id: toUUID(inv.id),
                material_id: toUUID(it.materialId),
                quantity: it.quantity || 1,
                rate: it.rate || 0,
                tax_rate: it.taxRate !== undefined ? it.taxRate : 18.00,
                subtotal: it.amount || (it.quantity * it.rate) || 0,
                tax_amount: it.taxAmount || 0,
                total: it.total || (it.amount + (it.taxAmount || 0)) || 0,
                transportation_amount: it.transportationAmount || 0
              });
            });
          }
          
          if (inv.payments && inv.payments.length > 0) {
            inv.payments.forEach((p, idx) => {
              paymentRows.push({
                id: toUUID(`${inv.id}_pay_${idx}`),
                invoice_id: toUUID(inv.id),
                buyer_id: toUUID(inv.buyerId),
                amount: p.amount || 0,
                payment_method: p.method === "Bank Transfer" || p.method === "UPI" || p.method === "Cash" || p.method === "Cheque" ? p.method : "Cash",
                reference_number: p.referenceNo || null,
                date: p.date || new Date().toISOString().split("T")[0],
                remarks: p.notes || null,
                created_at: new Date().toISOString()
              });
            });
          }
        });
        
        if (itemRows.length > 0) {
          const { error: iiError } = await supabase.from("invoice_items").upsert(itemRows);
          if (iiError) console.warn("Supabase Sync Warning (invoice_items):", iiError.message);
        }
        
        if (paymentRows.length > 0) {
          const { error: payError } = await supabase.from("payments").upsert(paymentRows);
          if (payError) console.warn("Supabase Sync Warning (payments):", payError.message);
        }
      }
    }
    
    console.log("Supabase replication sync process executed successfully");
  } catch (err: any) {
    console.error("Supabase replication failed:", err.message || err);
  }
};

// Async cloud puller to retrieve latest state from Supabase relational tables
const pullFromSupabase = async (): Promise<Partial<DBStructure> | null> => {
  if (!supabase) return null;
  try {
    console.log("Checking and pulling latest state from Supabase relational tables...");
    
    // Check connection first by executing simple select
    const { error: pError } = await supabase.from("profiles").select("id").limit(1);
    if (pError) {
      console.warn("Could not query profiles table from Supabase (may need SQL schema setup):", pError.message);
      return null;
    }
    
    // Fetch profiles/settings
    const settingsRes = await supabase.from("profiles").select("*").limit(1);
    // Fetch buyers
    const buyersRes = await supabase.from("buyers").select("*");
    // Fetch suppliers
    const suppliersRes = await supabase.from("suppliers").select("*");
    // Fetch materials
    const materialsRes = await supabase.from("materials").select("*");
    // Fetch notes
    const notesRes = await supabase.from("dashboard_notes").select("*");
    // Fetch logs
    const logsRes = await supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(200);
    // Fetch buyer ledger
    const buyerLedgerRes = await supabase.from("buyer_ledger").select("*");
    // Fetch supplier ledger
    const supplierLedgerRes = await supabase.from("supplier_ledger").select("*");
    // Fetch quotations
    const quotationsRes = await supabase.from("quotations").select("*, quotation_items(*)");
    // Fetch invoices
    const invoicesRes = await supabase.from("invoices").select("*, invoice_items(*), payments(*)");
    
    const pulledData: Partial<DBStructure> = {};
    
    if (settingsRes.data && settingsRes.data[0]) {
      const s = settingsRes.data[0];
      pulledData.settings = {
        companyName: s.company_name,
        address: s.address,
        phone: s.phone,
        email: s.email,
        website: "",
        gstIn: s.gstin,
        bankName: s.bank_name,
        bankAccount: s.bank_account,
        bankIfsc: s.bank_ifsc,
        upiId: s.upi_id || "",
        qrCodeUrl: s.qr_code_url || "",
        logoUrl: s.company_logo_url || "",
        invoiceFooter: s.invoice_footer || "",
        termsConditions: s.terms_conditions || "",
        currency: s.currency || "₹",
        defaultGstRate: Number(s.default_gst_rate || 18.00)
      };
    }
    
    if (buyersRes.data && buyersRes.data.length > 0) {
      pulledData.buyers = buyersRes.data.map((b: any) => ({
        id: b.id,
        name: b.name,
        contactPerson: b.contact_person || "",
        phone: b.phone || "",
        email: b.email || "",
        address: b.address || "",
        gstin: b.gstin || "",
        status: b.is_active ? "active" : "inactive",
        balance: Number(b.balance || 0)
      }));
    }
    
    if (suppliersRes.data && suppliersRes.data.length > 0) {
      pulledData.suppliers = suppliersRes.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        gstin: s.gstin || "",
        status: s.is_active ? "active" : "inactive",
        outstandingPayable: Number(s.outstanding_payable || 0)
      }));
    }
    
    if (materialsRes.data && materialsRes.data.length > 0) {
      pulledData.materials = materialsRes.data.map((m: any) => ({
        id: m.id,
        name: m.name,
        sku: m.id.substring(0, 8).toUpperCase(),
        category: m.category || "General",
        unit: m.uom || "Kgs",
        defaultPurchaseRate: Number(m.default_purchase_rate || 0),
        defaultSalesRate: Number(m.default_sales_rate || 0),
        minStockLevel: Number(m.minimum_threshold || 0),
        currentStock: Number(m.current_stock || 0)
      }));
    }
    
    if (notesRes.data && notesRes.data.length > 0) {
      pulledData.notes = notesRes.data.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.description || "",
        isPinned: n.is_pinned,
        isCompleted: n.is_completed,
        category: n.category || "General",
        createdAt: n.created_at
      }));
    }
    
    if (logsRes.data && logsRes.data.length > 0) {
      pulledData.logs = logsRes.data.map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        action: l.action,
        module: l.module,
        referenceId: l.reference_id || "",
        details: l.details || ""
      }));
    }
    
    if (buyerLedgerRes.data && buyerLedgerRes.data.length > 0) {
      pulledData.buyerLedger = buyerLedgerRes.data.map((bl: any) => ({
        id: bl.id,
        buyerId: bl.buyer_id,
        date: bl.date,
        type: bl.type,
        referenceId: bl.reference_id,
        description: bl.description || "",
        amount: Number(bl.amount || 0),
        balanceAfter: Number(bl.balance_after || 0)
      }));
    }
    
    if (supplierLedgerRes.data && supplierLedgerRes.data.length > 0) {
      pulledData.supplierLedger = supplierLedgerRes.data.map((sl: any) => ({
        id: sl.id,
        supplierId: sl.supplier_id,
        date: sl.date,
        type: sl.type,
        referenceId: sl.reference_id,
        description: sl.description || "",
        amount: Number(sl.amount || 0),
        balanceAfter: Number(sl.balance_after || 0)
      }));
    }
    
    if (quotationsRes.data && quotationsRes.data.length > 0) {
      pulledData.quotations = quotationsRes.data.map((q: any) => ({
        id: q.id,
        quoteNumber: q.quote_number,
        buyerId: q.buyer_id,
        date: q.date,
        dueDate: q.due_date || "",
        subtotal: Number(q.subtotal || 0),
        taxAmount: Number(q.tax_amount || 0),
        total: Number(q.total || 0),
        status: q.status,
        notes: q.notes || "",
        items: (q.quotation_items || []).map((it: any) => ({
          materialId: it.material_id,
          name: "Item",
          quantity: Number(it.quantity || 1),
          rate: Number(it.rate || 0),
          amount: Number(it.amount || 0)
        }))
      }));
    }
    
    if (invoicesRes.data && invoicesRes.data.length > 0) {
      pulledData.invoices = invoicesRes.data.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        buyerId: inv.buyer_id,
        date: inv.date,
        dueDate: inv.due_date || "",
        subtotal: Number(inv.subtotal || 0),
        taxAmount: Number(inv.tax_amount || 0),
        total: Number(inv.total || 0),
        balanceDue: Number(inv.total - inv.paid_amount),
        status: inv.status === "Paid" ? "paid" : (inv.status === "Partially Paid" ? "partial" : "unpaid"),
        notes: inv.notes || "",
        transport: inv.transport || null,
        attachments: [],
        items: (inv.invoice_items || []).map((it: any) => ({
          materialId: it.material_id,
          name: "Item",
          quantity: Number(it.quantity || 1),
          rate: Number(it.rate || 0),
          taxRate: Number(it.tax_rate || 18),
          amount: Number(it.subtotal || 0),
          taxAmount: Number(it.tax_amount || 0),
          total: Number(it.total || 0),
          transportationAmount: Number(it.transportation_amount || 0)
        })),
        payments: (inv.payments || []).map((p: any) => ({
          id: p.id,
          date: p.date,
          amount: Number(p.amount || 0),
          method: p.payment_method,
          referenceNo: p.reference_number || "",
          notes: p.remarks || ""
        }))
      }));
    }
    
    console.log("Successfully pulled latest state from Supabase cloud tables!");
    return pulledData;
  } catch (err: any) {
    console.error("Supabase pull failed:", err.message || err);
    return null;
  }
};

// Save DB helper
const saveDB = (data: DBStructure) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist database file to disk", err);
  }
  if (supabase) {
    // Replicate updates to Supabase and assign to syncPromise so subsequent requests await it
    syncPromise = syncToSupabase(data).catch(err => {
      console.error("Supabase sync background error:", err);
    });
  }
};

// Log activity helper
const addLog = (db: DBStructure, action: string, module: string, details: string) => {
  const newLog: ActivityLog = {
    id: `l_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    action,
    module,
    details
  };
  db.logs.unshift(newLog);
  // Cap log history at 200 entries to prevent files ballooning
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
};

// Initialize server data
let db = loadDB();

// Startup cloud synchronization routine
const initCloudSync = async () => {
  if (!supabase) return;
  const cloudData = await pullFromSupabase();
  if (cloudData && Object.keys(cloudData).length > 0) {
    db = {
      ...db,
      ...cloudData,
      session: db.session // preserve local session state
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to write hydrated DB to disk", err);
    }
    console.log("Local database successfully hydrated with Supabase cloud state.");
  } else {
    console.log("Supabase empty or schema not deployed yet. Replicating current local state to cloud...");
    await syncToSupabase(db);
  }
};

// Trigger startup sync asynchronously in background and track it
if (supabase) {
  syncPromise = initCloudSync().catch(err => console.error("Startup cloud sync failed:", err));
}


// --- API ROUTES ---

// 0. Production Health Check
app.get("/api/health-check", async (req, res) => {
  const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;
  const isSupabaseInitialized = supabase !== null;
  let supabaseConnectionSuccess = false;
  let supabaseError = null;

  if (isSupabaseInitialized) {
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (error) {
        supabaseError = error.message;
      } else {
        supabaseConnectionSuccess = true;
      }
    } catch (err: any) {
      supabaseError = err.message || err;
    }
  }

  res.json({
    status: "ok",
    environment: {
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV
    },
    supabase: {
      configured: isSupabaseConfigured,
      initialized: isSupabaseInitialized,
      connected: supabaseConnectionSuccess,
      error: supabaseError,
      url: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : "missing"
    }
  });
});

// 1. Authentication
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  // This is a private, single-admin business tool. Enforce simple secure admin password
  if (username === "admin" && (password === "password" || password === "admin123")) {
    db.session.isLoggedIn = true;
    db.session.username = "admin";
    saveDB(db);
    addLog(db, "Admin Login", "Auth", "Successfully authenticated admin session");
    saveDB(db);
    return res.json({ success: true, session: db.session });
  }
  
  return res.status(401).json({ success: false, error: "Invalid credentials. Please verify your password." });
});

app.post("/api/auth/logout", (req, res) => {
  db.session.isLoggedIn = false;
  saveDB(db);
  addLog(db, "Admin Logout", "Auth", "Ended current admin session");
  saveDB(db);
  res.json({ success: true });
});

app.get("/api/auth/session", (req, res) => {
  res.json({ session: db.session });
});

// 2. Dashboard KPIs & Activity
app.get("/api/dashboard", (req, res) => {
  db = loadDB();
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Calculate aggregate metrics
  const todaySales = db.invoices
    .filter(inv => inv.date === todayStr)
    .reduce((sum, inv) => sum + inv.total, 0);

  const monthlySales = db.invoices
    .reduce((sum, inv) => sum + inv.total, 0); // Simplification for MTD representation

  const receivables = db.invoices
    .reduce((sum, inv) => sum + inv.balanceDue, 0);

  const payables = db.suppliers
    .reduce((sum, sup) => sum + sup.outstandingPayable, 0);

  res.json({
    kpis: {
      todaySales,
      monthlySales,
      receivables,
      payables
    },
    recentActivities: db.logs.slice(0, 8),
    recentInvoices: db.invoices.slice(-5).reverse(),
    lowStockMaterials: db.materials.filter(m => m.currentStock <= m.minStockLevel),
    notes: db.notes
  });
});

// 3. Buyer Directory & Ledger
app.get("/api/buyers", (req, res) => {
  db = loadDB();
  res.json({ buyers: db.buyers });
});

app.get("/api/buyer-ledger", (req, res) => {
  db = loadDB();
  res.json({ ledger: db.buyerLedger });
});

app.get("/api/buyers/:id/ledger", (req, res) => {
  db = loadDB();
  const ledger = db.buyerLedger.filter(entry => entry.buyerId === req.params.id);
  const buyer = db.buyers.find(b => b.id === req.params.id);
  res.json({ ledger, buyer });
});

app.post("/api/buyers", (req, res) => {
  db = loadDB();
  const { name, contactPerson, phone, email, address, gstin, balance } = req.body;
  const newBuyer: Buyer = {
    id: `b_${Date.now()}`,
    name,
    contactPerson,
    phone,
    email,
    address,
    gstin,
    status: "active",
    balance: Number(balance) || 0
  };
  
  db.buyers.push(newBuyer);
  
  // Add opening entry if balance > 0
  if (newBuyer.balance !== 0) {
    db.buyerLedger.push({
      id: `bl_${Date.now()}`,
      buyerId: newBuyer.id,
      date: new Date().toISOString().split("T")[0],
      type: "opening",
      referenceId: "opening",
      amount: newBuyer.balance,
      description: "Opening Ledger Balance",
      balanceAfter: newBuyer.balance
    });
  }

  addLog(db, "Add Buyer", "Buyers", `Registered new buyer company: ${name}`);
  saveDB(db);
  res.json({ success: true, buyer: newBuyer });
});

app.put("/api/buyers/:id", (req, res) => {
  db = loadDB();
  const { name, contactPerson, phone, email, address, gstin, status, balance } = req.body;
  const index = db.buyers.findIndex(b => b.id === req.params.id);
  
  if (index !== -1) {
    const oldBuyer = db.buyers[index];
    const prevBalance = oldBuyer.balance;
    const newBalance = Number(balance);

    db.buyers[index] = {
      ...oldBuyer,
      name,
      contactPerson,
      phone,
      email,
      address,
      gstin,
      status: status || oldBuyer.status,
      balance: isNaN(newBalance) ? prevBalance : newBalance
    };

    // If balance was adjusted manually, log ledger reconciliation
    if (!isNaN(newBalance) && prevBalance !== newBalance) {
      db.buyerLedger.push({
        id: `bl_${Date.now()}`,
        buyerId: req.params.id,
        date: new Date().toISOString().split("T")[0],
        type: "opening",
        referenceId: "adjustment",
        amount: Math.abs(newBalance - prevBalance),
        description: `Manual balance reconciliation (Was: ${prevBalance}, Adjusted to: ${newBalance})`,
        balanceAfter: newBalance
      });
    }

    addLog(db, "Update Buyer", "Buyers", `Updated details for buyer: ${name}`);
    saveDB(db);
    return res.json({ success: true, buyer: db.buyers[index] });
  }
  res.status(404).json({ success: false, error: "Buyer profile not found" });
});

app.delete("/api/buyers/:id", (req, res) => {
  db = loadDB();
  const hasInvoices = db.invoices.some(inv => inv.buyerId === req.params.id && inv.balanceDue > 0);
  if (hasInvoices) {
    return res.status(400).json({ success: false, error: "Cannot delete buyer with pending outstanding balances." });
  }

  const buyer = db.buyers.find(b => b.id === req.params.id);
  db.buyers = db.buyers.filter(b => b.id !== req.params.id);
  db.buyerLedger = db.buyerLedger.filter(bl => bl.buyerId !== req.params.id);
  
  if (buyer) {
    addLog(db, "Delete Buyer", "Buyers", `Deleted buyer profile and ledger logs for: ${buyer.name}`);
  }
  saveDB(db);
  res.json({ success: true });
});

// 4. Supplier Directory & Ledger
app.get("/api/suppliers", (req, res) => {
  db = loadDB();
  res.json({ suppliers: db.suppliers });
});

app.get("/api/suppliers/:id/ledger", (req, res) => {
  db = loadDB();
  const ledger = db.supplierLedger.filter(entry => entry.supplierId === req.params.id);
  const supplier = db.suppliers.find(s => s.id === req.params.id);
  res.json({ ledger, supplier });
});

app.post("/api/suppliers", (req, res) => {
  db = loadDB();
  const { name, contactPerson, phone, email, address, gstin, outstandingPayable } = req.body;
  const newSupplier: Supplier = {
    id: `s_${Date.now()}`,
    name,
    contactPerson,
    phone,
    email,
    address,
    gstin,
    status: "active",
    outstandingPayable: Number(outstandingPayable) || 0
  };
  
  db.suppliers.push(newSupplier);

  if (newSupplier.outstandingPayable !== 0) {
    db.supplierLedger.push({
      id: `sl_${Date.now()}`,
      supplierId: newSupplier.id,
      date: new Date().toISOString().split("T")[0],
      type: "opening",
      referenceId: "opening",
      amount: newSupplier.outstandingPayable,
      description: "Opening Purchase Balance Outstanding",
      balanceAfter: newSupplier.outstandingPayable
    });
  }

  addLog(db, "Add Supplier", "Suppliers", `Registered supplier: ${name}`);
  saveDB(db);
  res.json({ success: true, supplier: newSupplier });
});

app.put("/api/suppliers/:id", (req, res) => {
  db = loadDB();
  const { name, contactPerson, phone, email, address, gstin, status, outstandingPayable } = req.body;
  const index = db.suppliers.findIndex(s => s.id === req.params.id);
  
  if (index !== -1) {
    const oldSupplier = db.suppliers[index];
    const prevPayable = oldSupplier.outstandingPayable;
    const newPayable = Number(outstandingPayable);

    db.suppliers[index] = {
      ...oldSupplier,
      name,
      contactPerson,
      phone,
      email,
      address,
      gstin,
      status: status || oldSupplier.status,
      outstandingPayable: isNaN(newPayable) ? prevPayable : newPayable
    };

    if (!isNaN(newPayable) && prevPayable !== newPayable) {
      db.supplierLedger.push({
        id: `sl_${Date.now()}`,
        supplierId: req.params.id,
        date: new Date().toISOString().split("T")[0],
        type: "opening",
        referenceId: "adjustment",
        amount: Math.abs(newPayable - prevPayable),
        description: `Manual outstanding ledger adjustment (Was: ${prevPayable}, Adjusted to: ${newPayable})`,
        balanceAfter: newPayable
      });
    }

    addLog(db, "Update Supplier", "Suppliers", `Updated parameters for supplier: ${name}`);
    saveDB(db);
    return res.json({ success: true, supplier: db.suppliers[index] });
  }
  res.status(404).json({ success: false, error: "Supplier profile not found" });
});

app.delete("/api/suppliers/:id", (req, res) => {
  db = loadDB();
  const supplier = db.suppliers.find(s => s.id === req.params.id);
  db.suppliers = db.suppliers.filter(s => s.id !== req.params.id);
  db.supplierLedger = db.supplierLedger.filter(sl => sl.supplierId !== req.params.id);
  
  if (supplier) {
    addLog(db, "Delete Supplier", "Suppliers", `Deleted supplier record and historical ledger logs for: ${supplier.name}`);
  }
  saveDB(db);
  res.json({ success: true });
});

// 5. Material Catalog & Inventory
app.get("/api/materials", (req, res) => {
  db = loadDB();
  res.json({ materials: db.materials });
});

app.post("/api/materials", (req, res) => {
  db = loadDB();
  const { name, sku, category, unit, defaultPurchaseRate, defaultSalesRate, minStockLevel, currentStock } = req.body;
  const newMaterial: Material = {
    id: `m_${Date.now()}`,
    name,
    sku: sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    category: category || "General",
    unit: unit || "units",
    defaultPurchaseRate: Number(defaultPurchaseRate) || 0,
    defaultSalesRate: Number(defaultSalesRate) || 0,
    minStockLevel: Number(minStockLevel) || 10,
    currentStock: Number(currentStock) || 0
  };

  db.materials.push(newMaterial);

  if (newMaterial.currentStock > 0) {
    db.stockAdjustments.push({
      id: `sa_${Date.now()}`,
      materialId: newMaterial.id,
      date: new Date().toISOString().split("T")[0],
      type: "add",
      quantity: newMaterial.currentStock,
      description: "Initial material creation stock setup"
    });
  }

  addLog(db, "Add Material", "Inventory", `Created material item catalog card: ${name}`);
  saveDB(db);
  res.json({ success: true, material: newMaterial });
});

app.put("/api/materials/:id", (req, res) => {
  db = loadDB();
  const { name, sku, category, unit, defaultPurchaseRate, defaultSalesRate, minStockLevel, currentStock } = req.body;
  const index = db.materials.findIndex(m => m.id === req.params.id);

  if (index !== -1) {
    const oldMaterial = db.materials[index];
    const prevStock = oldMaterial.currentStock;
    const newStock = Number(currentStock);

    db.materials[index] = {
      ...oldMaterial,
      name,
      sku: sku || oldMaterial.sku,
      category: category || oldMaterial.category,
      unit: unit || oldMaterial.unit,
      defaultPurchaseRate: Number(defaultPurchaseRate) || 0,
      defaultSalesRate: Number(defaultSalesRate) || 0,
      minStockLevel: Number(minStockLevel) || 0,
      currentStock: isNaN(newStock) ? prevStock : newStock
    };

    // If stock changed directly, log an adjustment
    if (!isNaN(newStock) && prevStock !== newStock) {
      db.stockAdjustments.push({
        id: `sa_${Date.now()}`,
        materialId: req.params.id,
        date: new Date().toISOString().split("T")[0],
        type: newStock > prevStock ? "add" : "remove",
        quantity: Math.abs(newStock - prevStock),
        description: `Direct manual stock catalog edit reconciliation (Was: ${prevStock}, Adjusted to: ${newStock})`
      });
    }

    addLog(db, "Update Material", "Inventory", `Updated catalog parameters for material item: ${name}`);
    saveDB(db);
    return res.json({ success: true, material: db.materials[index] });
  }
  res.status(404).json({ success: false, error: "Material not found" });
});

app.post("/api/materials/:id/adjust", (req, res) => {
  db = loadDB();
  const { type, quantity, description } = req.body;
  const index = db.materials.findIndex(m => m.id === req.params.id);

  if (index !== -1) {
    const material = db.materials[index];
    const qtyVal = Number(quantity);
    
    if (type === "add") {
      material.currentStock += qtyVal;
    } else if (type === "remove") {
      material.currentStock = Math.max(0, material.currentStock - qtyVal);
    } else if (type === "reconcile") {
      material.currentStock = qtyVal;
    }

    db.stockAdjustments.push({
      id: `sa_${Date.now()}`,
      materialId: req.params.id,
      date: new Date().toISOString().split("T")[0],
      type,
      quantity: qtyVal,
      description: description || "Manual reconciliation adjustment"
    });

    addLog(db, "Stock Adjust", "Inventory", `Adjusted Stock of ${material.name} by ${type === "remove" ? "-" : ""}${qtyVal} units`);
    saveDB(db);
    return res.json({ success: true, material });
  }
  res.status(404).json({ success: false, error: "Material not found" });
});

app.delete("/api/materials/:id", (req, res) => {
  db = loadDB();
  const material = db.materials.find(m => m.id === req.params.id);
  db.materials = db.materials.filter(m => m.id !== req.params.id);
  db.stockAdjustments = db.stockAdjustments.filter(sa => sa.materialId !== req.params.id);
  
  if (material) {
    addLog(db, "Delete Material", "Inventory", `Removed material item from catalog: ${material.name}`);
  }
  saveDB(db);
  res.json({ success: true });
});

// 6. Quotation Module
app.get("/api/quotations", (req, res) => {
  db = loadDB();
  res.json({ quotations: db.quotations });
});

app.post("/api/quotations", (req, res) => {
  db = loadDB();
  const { buyerId, date, dueDate, items, notes, status } = req.body;
  
  const quoteNumber = `QT-2026-${String(db.quotations.length + 1).padStart(3, "0")}`;
  
  // Calculate Totals
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.rate) * Number(it.quantity)), 0);
  const defaultGstRate = db.settings.defaultGstRate || 18;
  const taxAmount = Math.round(subtotal * (defaultGstRate / 100));
  const total = subtotal + taxAmount;

  const newQuote: Quotation = {
    id: `q_${Date.now()}`,
    quoteNumber,
    buyerId,
    date: date || new Date().toISOString().split("T")[0],
    dueDate: dueDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0],
    items: items.map((it: any) => ({
      materialId: it.materialId,
      name: it.name,
      quantity: Number(it.quantity),
      rate: Number(it.rate),
      amount: Number(it.quantity) * Number(it.rate)
    })),
    status: status || "draft",
    subtotal,
    taxAmount,
    total,
    notes
  };

  db.quotations.push(newQuote);
  addLog(db, "Create Quote", "Quotations", `Drafted quotation: ${quoteNumber} for client buyer`);
  saveDB(db);
  res.json({ success: true, quotation: newQuote });
});

app.put("/api/quotations/:id", (req, res) => {
  db = loadDB();
  const { buyerId, date, dueDate, items, notes, status } = req.body;
  const index = db.quotations.findIndex(q => q.id === req.params.id);

  if (index !== -1) {
    const oldQuote = db.quotations[index];
    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.rate) * Number(it.quantity)), 0);
    const defaultGstRate = db.settings.defaultGstRate || 18;
    const taxAmount = Math.round(subtotal * (defaultGstRate / 100));
    const total = subtotal + taxAmount;

    db.quotations[index] = {
      ...oldQuote,
      buyerId: buyerId || oldQuote.buyerId,
      date: date || oldQuote.date,
      dueDate: dueDate || oldQuote.dueDate,
      items: items.map((it: any) => ({
        materialId: it.materialId,
        name: it.name,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        amount: Number(it.quantity) * Number(it.rate)
      })),
      status: status || oldQuote.status,
      subtotal,
      taxAmount,
      total,
      notes: notes !== undefined ? notes : oldQuote.notes
    };

    addLog(db, "Update Quote", "Quotations", `Modified quotation items on sheet: ${oldQuote.quoteNumber}`);
    saveDB(db);
    return res.json({ success: true, quotation: db.quotations[index] });
  }
  res.status(404).json({ success: false, error: "Quotation sheet not found" });
});

app.post("/api/quotations/:id/convert", (req, res) => {
  db = loadDB();
  const quoteIndex = db.quotations.findIndex(q => q.id === req.params.id);

  if (quoteIndex !== -1) {
    const quote = db.quotations[quoteIndex];
    if (quote.status === "converted") {
      return res.status(400).json({ success: false, error: "This quotation is already converted to an invoice." });
    }

    const invoiceNumber = `VSR-2026-${String(db.invoices.length + 1).padStart(4, "0")}`;
    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      buyerId: quote.buyerId,
      date: new Date().toISOString().split("T")[0],
      items: quote.items.map(it => {
        const qty = Number(it.quantity);
        const rate = Number(it.rate);
        const mat = db.materials.find(m => m.id === it.materialId);
        const purchase_rate = Number(mat?.defaultPurchaseRate || 0);
        
        const sellingAmount = qty * rate;
        const purchaseAmount = qty * purchase_rate;
        const profit = sellingAmount - purchaseAmount; // No transportation for initial quote conversion
        const margin_percentage = sellingAmount > 0 ? (profit / sellingAmount) * 100 : 0;

        return {
          materialId: it.materialId,
          name: it.name,
          quantity: qty,
          rate: rate,
          amount: sellingAmount,
          transportation_amount: 0,
          transport_supplier_id: null,
          transportation_notes: "",
          purchase_rate: purchase_rate,
          selling_rate: rate,
          profit: profit,
          margin_percentage: Math.round(margin_percentage * 100) / 100
        };
      }),
      status: "unpaid",
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      balanceDue: quote.total,
      payments: [],
      attachments: [],
      notes: `Autogenerated from Quote Conversion: ${quote.quoteNumber}. ${quote.notes || ""}`
    };

    // Update buyer balance in ledger
    const buyerIndex = db.buyers.findIndex(b => b.id === quote.buyerId);
    if (buyerIndex !== -1) {
      db.buyers[buyerIndex].balance += newInvoice.total;
      db.buyerLedger.push({
        id: `bl_${Date.now()}`,
        buyerId: quote.buyerId,
        date: newInvoice.date,
        type: "invoice",
        referenceId: newInvoice.id,
        amount: newInvoice.total,
        description: `Invoice generated by quotation conversion: ${newInvoice.invoiceNumber}`,
        balanceAfter: db.buyers[buyerIndex].balance
      });
    }

    // Adjust inventory on hand
    newInvoice.items.forEach(it => {
      const mat = db.materials.find(m => m.id === it.materialId);
      if (mat) {
        mat.currentStock = Math.max(0, mat.currentStock - it.quantity);
        db.stockAdjustments.push({
          id: `sa_${Date.now()}`,
          materialId: mat.id,
          date: newInvoice.date,
          type: "remove",
          quantity: it.quantity,
          description: `Dispatched stock via Invoice: ${newInvoice.invoiceNumber}`
        });
      }
    });

    quote.status = "converted";
    quote.convertedInvoiceId = newInvoice.id;
    db.invoices.push(newInvoice);

    addLog(db, "Convert Quote", "Quotations", `Successfully converted Quote ${quote.quoteNumber} to active ledger Invoice ${newInvoice.invoiceNumber}`);
    saveDB(db);
    return res.json({ success: true, invoice: newInvoice, quotation: quote });
  }
  res.status(404).json({ success: false, error: "Quotation sheet not found" });
});

app.delete("/api/quotations/:id", (req, res) => {
  db = loadDB();
  const quote = db.quotations.find(q => q.id === req.params.id);
  db.quotations = db.quotations.filter(q => q.id !== req.params.id);
  
  if (quote) {
    addLog(db, "Delete Quote", "Quotations", `Deleted quotation: ${quote.quoteNumber}`);
  }
  saveDB(db);
  res.json({ success: true });
});

// 7. Invoice Module
app.get("/api/invoices", (req, res) => {
  db = loadDB();
  res.json({ invoices: db.invoices });
});

app.post("/api/invoices", (req, res) => {
  db = loadDB();
  const { buyerId, date, items, notes, transport } = req.body;

  const invoiceNumber = `VSR-2026-${String(db.invoices.length + 1).padStart(4, "0")}`;
  
  // Calculate Totals and store details
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.rate) * Number(it.quantity)), 0);
  const item_level_transportation = items.reduce((sum: number, it: any) => sum + Number(it.transportation_amount || 0), 0);
  const global_transportation = transport ? Math.max(0, Number(transport.amount || 0)) : 0;
  const total_transportation = item_level_transportation + global_transportation;
  
  const defaultGstRate = db.settings.defaultGstRate || 18;
  const taxAmount = Math.round(subtotal * (defaultGstRate / 100));
  const total = subtotal + taxAmount + total_transportation;

  const invoiceDate = date || new Date().toISOString().split("T")[0];

  const newInvoice: Invoice = {
    id: `inv_${Date.now()}`,
    invoiceNumber,
    buyerId,
    date: invoiceDate,
    items: items.map((it: any) => {
      const qty = Number(it.quantity);
      const rate = Number(it.rate); // selling_rate
      const transAmt = Number(it.transportation_amount || 0);
      const mat = db.materials.find(m => m.id === it.materialId);
      const purchase_rate = Number(it.purchase_rate || mat?.defaultPurchaseRate || 0);
      
      const sellingAmount = qty * rate;
      const purchaseAmount = qty * purchase_rate;
      const profit = sellingAmount - purchaseAmount - transAmt;
      const margin_percentage = sellingAmount > 0 ? (profit / sellingAmount) * 100 : 0;

      return {
        materialId: it.materialId,
        name: it.name,
        quantity: qty,
        rate: rate,
        amount: sellingAmount, // Keep amount as Material Subtotal for compatibility
        transportation_amount: transAmt,
        transport_supplier_id: it.transport_supplier_id || null,
        transportation_notes: it.transportation_notes || "",
        purchase_rate: purchase_rate,
        selling_rate: rate,
        profit: profit,
        margin_percentage: Math.round(margin_percentage * 100) / 100 // rounded to 2 decimal places
      };
    }),
    status: "unpaid",
    subtotal,
    taxAmount,
    total,
    balanceDue: total,
    payments: [],
    attachments: [],
    notes,
    transport: transport ? {
      supplierId: transport.supplierId || null,
      amount: Math.max(0, Number(transport.amount || 0)),
      notes: transport.notes || ""
    } : undefined
  };

  db.invoices.push(newInvoice);

  // Update buyer ledger balance
  const buyerIndex = db.buyers.findIndex(b => b.id === buyerId);
  if (buyerIndex !== -1) {
    db.buyers[buyerIndex].balance += total;
    db.buyerLedger.push({
      id: `bl_${Date.now()}`,
      buyerId: buyerId,
      date: newInvoice.date,
      type: "invoice",
      referenceId: newInvoice.id,
      amount: total,
      description: `Invoice billing generated: ${invoiceNumber}`,
      balanceAfter: db.buyers[buyerIndex].balance
    });
  }

  // Stock deduction
  newInvoice.items.forEach(it => {
    const mat = db.materials.find(m => m.id === it.materialId);
    if (mat) {
      mat.currentStock = Math.max(0, mat.currentStock - it.quantity);
      db.stockAdjustments.push({
        id: `sa_${Date.now()}`,
        materialId: mat.id,
        date: newInvoice.date,
        type: "remove",
        quantity: it.quantity,
        description: `Deducted stock on Invoice Dispatch: ${invoiceNumber}`
      });
    }
  });

  addLog(db, "Create Invoice", "Invoices", `Created customer invoice sheet: ${invoiceNumber}`);
  saveDB(db);
  res.json({ success: true, invoice: newInvoice });
});

app.post("/api/invoices/:id/payment", (req, res) => {
  db = loadDB();
  const { amount, method, referenceNo, notes } = req.body;
  const index = db.invoices.findIndex(inv => inv.id === req.params.id);

  if (index !== -1) {
    const invoice = db.invoices[index];
    const payAmt = Number(amount);

    if (payAmt <= 0) {
      return res.status(400).json({ success: false, error: "Payment amount must be greater than zero." });
    }

    if (payAmt > invoice.balanceDue) {
      return res.status(400).json({ success: false, error: "Payment exceeds remaining balance outstanding." });
    }

    const newPayment: Payment = {
      id: `p_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      amount: payAmt,
      method,
      referenceNo,
      notes
    };

    invoice.payments.push(newPayment);
    invoice.balanceDue = Math.max(0, invoice.balanceDue - payAmt);
    
    if (invoice.balanceDue === 0) {
      invoice.status = "paid";
    } else {
      invoice.status = "partial";
    }

    // Deduct buyer's ledger balance
    const buyerIndex = db.buyers.findIndex(b => b.id === invoice.buyerId);
    if (buyerIndex !== -1) {
      db.buyers[buyerIndex].balance = Math.max(0, db.buyers[buyerIndex].balance - payAmt);
      db.buyerLedger.push({
        id: `bl_${Date.now()}`,
        buyerId: invoice.buyerId,
        date: newPayment.date,
        type: "payment",
        referenceId: invoice.id,
        amount: payAmt,
        description: `Payment received of ₹${payAmt} against Invoice: ${invoice.invoiceNumber} (${method})`,
        balanceAfter: db.buyers[buyerIndex].balance
      });
    }

    addLog(db, "Log Payment", "Invoices", `Added payment receipt of ₹${payAmt} to Invoice: ${invoice.invoiceNumber}`);
    saveDB(db);
    return res.json({ success: true, invoice });
  }
  res.status(404).json({ success: false, error: "Invoice ledger not found" });
});

app.post("/api/invoices/:id/attachment", (req, res) => {
  db = loadDB();
  const { name, fileType, size, base64Data } = req.body;
  const index = db.invoices.findIndex(inv => inv.id === req.params.id);

  if (index !== -1) {
    const invoice = db.invoices[index];
    const newAttachment: Attachment = {
      id: `att_${Date.now()}`,
      name,
      fileType,
      size,
      base64Data,
      uploadedAt: new Date().toISOString()
    };

    invoice.attachments.push(newAttachment);
    addLog(db, "Upload Attachment", "Invoices", `Attached file: ${name} to Invoice: ${invoice.invoiceNumber}`);
    saveDB(db);
    return res.json({ success: true, invoice });
  }
  res.status(404).json({ success: false, error: "Invoice record not found" });
});

app.post("/api/invoices/:id/duplicate", (req, res) => {
  db = loadDB();
  const src = db.invoices.find(inv => inv.id === req.params.id);

  if (src) {
    const invoiceNumber = `VSR-2026-${String(db.invoices.length + 1).padStart(4, "0")}`;
    const newInvoice: Invoice = {
      ...src,
      id: `inv_${Date.now()}`,
      invoiceNumber,
      date: new Date().toISOString().split("T")[0],
      status: "unpaid",
      balanceDue: src.total,
      payments: [],
      attachments: [],
      notes: `Duplicated templated invoice from: ${src.invoiceNumber}. ${src.notes || ""}`
    };

    db.invoices.push(newInvoice);

    // Update buyer balance in ledger
    const buyerIndex = db.buyers.findIndex(b => b.id === newInvoice.buyerId);
    if (buyerIndex !== -1) {
      db.buyers[buyerIndex].balance += newInvoice.total;
      db.buyerLedger.push({
        id: `bl_${Date.now()}`,
        buyerId: newInvoice.buyerId,
        date: newInvoice.date,
        type: "invoice",
        referenceId: newInvoice.id,
        amount: newInvoice.total,
        description: `Duplicated Invoice billing generated: ${invoiceNumber}`,
        balanceAfter: db.buyers[buyerIndex].balance
      });
    }

    // Deduct stock
    newInvoice.items.forEach(it => {
      const mat = db.materials.find(m => m.id === it.materialId);
      if (mat) {
        mat.currentStock = Math.max(0, mat.currentStock - it.quantity);
        db.stockAdjustments.push({
          id: `sa_${Date.now()}`,
          materialId: mat.id,
          date: newInvoice.date,
          type: "remove",
          quantity: it.quantity,
          description: `Dispatched stock via Duplicated Invoice: ${invoiceNumber}`
        });
      }
    });

    addLog(db, "Duplicate Invoice", "Invoices", `Duplicated invoice ${src.invoiceNumber} to new sheet: ${invoiceNumber}`);
    saveDB(db);
    return res.json({ success: true, invoice: newInvoice });
  }
  res.status(404).json({ success: false, error: "Source invoice not found" });
});

app.delete("/api/invoices/:id", (req, res) => {
  db = loadDB();
  const index = db.invoices.findIndex(inv => inv.id === req.params.id);

  if (index !== -1) {
    const invoice = db.invoices[index];
    
    // Reverse buyer balance before deletion
    const buyerIndex = db.buyers.findIndex(b => b.id === invoice.buyerId);
    if (buyerIndex !== -1) {
      db.buyers[buyerIndex].balance = Math.max(0, db.buyers[buyerIndex].balance - invoice.balanceDue);
      db.buyerLedger.push({
        id: `bl_${Date.now()}`,
        buyerId: invoice.buyerId,
        date: new Date().toISOString().split("T")[0],
        type: "opening",
        referenceId: "deletion",
        amount: invoice.balanceDue,
        description: `Invoice deletion reversal: ${invoice.invoiceNumber}`,
        balanceAfter: db.buyers[buyerIndex].balance
      });
    }

    // Reverse inventory deduction
    invoice.items.forEach(it => {
      const mat = db.materials.find(m => m.id === it.materialId);
      if (mat) {
        mat.currentStock += it.quantity;
        db.stockAdjustments.push({
          id: `sa_${Date.now()}`,
          materialId: mat.id,
          date: new Date().toISOString().split("T")[0],
          type: "add",
          quantity: it.quantity,
          description: `Restored stock on Invoice Deletion: ${invoice.invoiceNumber}`
        });
      }
    });

    db.invoices.splice(index, 1);
    addLog(db, "Delete Invoice", "Invoices", `Deleted active ledger invoice record: ${invoice.invoiceNumber}`);
    saveDB(db);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, error: "Invoice not found" });
});

// 8. Notes Manager API
app.get("/api/notes", (req, res) => {
  db = loadDB();
  res.json({ notes: db.notes });
});

app.post("/api/notes", (req, res) => {
  db = loadDB();
  const { title, content, isPinned, reminderDate, category } = req.body;
  const newNote: DashboardNote = {
    id: `n_${Date.now()}`,
    title,
    content,
    isPinned: !!isPinned,
    isCompleted: false,
    reminderDate,
    category: category || "General",
    createdAt: new Date().toISOString()
  };

  db.notes.unshift(newNote);
  addLog(db, "Create Note", "Dashboard", `Added note widget memo: ${title}`);
  saveDB(db);
  res.json({ success: true, note: newNote });
});

app.put("/api/notes/:id", (req, res) => {
  db = loadDB();
  const index = db.notes.findIndex(n => n.id === req.params.id);

  if (index !== -1) {
    const { title, content, isPinned, isCompleted, reminderDate, category } = req.body;
    db.notes[index] = {
      ...db.notes[index],
      title: title !== undefined ? title : db.notes[index].title,
      content: content !== undefined ? content : db.notes[index].content,
      isPinned: isPinned !== undefined ? !!isPinned : db.notes[index].isPinned,
      isCompleted: isCompleted !== undefined ? !!isCompleted : db.notes[index].isCompleted,
      reminderDate: reminderDate !== undefined ? reminderDate : db.notes[index].reminderDate,
      category: category !== undefined ? category : db.notes[index].category
    };

    saveDB(db);
    return res.json({ success: true, note: db.notes[index] });
  }
  res.status(404).json({ success: false, error: "Note not found" });
});

app.delete("/api/notes/:id", (req, res) => {
  db = loadDB();
  db.notes = db.notes.filter(n => n.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// 9. General Settings
app.get("/api/settings", (req, res) => {
  db = loadDB();
  res.json({ settings: db.settings });
});

app.put("/api/settings", (req, res) => {
  db = loadDB();
  const { 
    companyName, address, phone, email, website, 
    bankName, bankAccount, bankIfsc, gstIn, defaultGstRate, currency,
    upiId, qrCodeUrl
  } = req.body;

  db.settings = {
    ...db.settings,
    companyName: companyName !== undefined ? companyName : db.settings.companyName,
    address: address !== undefined ? address : db.settings.address,
    phone: phone !== undefined ? phone : db.settings.phone,
    email: email !== undefined ? email : db.settings.email,
    website: website !== undefined ? website : db.settings.website,
    bankName: bankName !== undefined ? bankName : db.settings.bankName,
    bankAccount: bankAccount !== undefined ? bankAccount : db.settings.bankAccount,
    bankIfsc: bankIfsc !== undefined ? bankIfsc : db.settings.bankIfsc,
    gstIn: gstIn !== undefined ? gstIn : db.settings.gstIn,
    defaultGstRate: defaultGstRate !== undefined ? Number(defaultGstRate) : db.settings.defaultGstRate,
    currency: currency !== undefined ? currency : db.settings.currency,
    upiId: upiId !== undefined ? upiId : db.settings.upiId,
    qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : db.settings.qrCodeUrl
  };

  addLog(db, "Update Settings", "Settings", "Saved customized profile settings parameters");
  saveDB(db);
  res.json({ success: true, settings: db.settings });
});

// 10. Documents & Attachment Vault Manager
app.get("/api/documents", (req, res) => {
  db = loadDB();
  const documents: Array<{
    id: string;
    invoiceId: string;
    invoiceNo: string;
    buyerName: string;
    name: string;
    fileType: string;
    size: number;
    uploadedAt: string;
  }> = [];

  db.invoices.forEach(inv => {
    const buyer = db.buyers.find(b => b.id === inv.buyerId);
    inv.attachments.forEach(att => {
      documents.push({
        id: att.id,
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNumber,
        buyerName: buyer ? buyer.name : "Unknown Buyer",
        name: att.name,
        fileType: att.fileType,
        size: att.size,
        uploadedAt: att.uploadedAt
      });
    });
  });

  res.json({ documents });
});

app.delete("/api/documents/:id", (req, res) => {
  db = loadDB();
  let deleted = false;
  
  db.invoices.forEach(inv => {
    const origCount = inv.attachments.length;
    inv.attachments = inv.attachments.filter(att => att.id !== req.params.id);
    if (inv.attachments.length < origCount) {
      deleted = true;
    }
  });

  if (deleted) {
    addLog(db, "Delete Document", "Documents", "Purged document upload from server vault");
    saveDB(db);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, error: "Document attachment not found" });
});

// 11. Activity Logs
app.get("/api/logs", (req, res) => {
  db = loadDB();
  res.json({ logs: db.logs });
});

app.post("/api/logs", (req, res) => {
  db = loadDB();
  const { action, module, details } = req.body;
  addLog(db, action, module, details);
  saveDB(db);
  res.json({ success: true, logs: db.logs });
});

// 12. Wipe Database
app.post("/api/wipe", (req, res) => {
  db = getInitialData();
  saveDB(db);
  res.json({ success: true });
});

// Vite Middleware for asset transpiling and routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Pavan Ledger Engine] Active & Serving on http://localhost:${PORT}`);
  });
}

// Only start the server listening if not running in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
