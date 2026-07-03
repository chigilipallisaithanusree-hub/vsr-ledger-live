import React, { useState, useEffect } from "react";
import { 
  Buyer, Supplier, Material, Quotation, Invoice, DashboardNote, BusinessSettings, ActivityLog,
  SupplierLedgerEntry, StockAdjustment, QuoteItem, InvoiceItem, Attachment, BuyerLedgerEntry
} from "./types";
import { 
  LayoutDashboard, Users, Factory, Boxes, FileText, CreditCard, BarChart3, 
  Settings, History, LogOut, Lock, Key, AlertCircle, Sparkles, TrendingUp,
  DollarSign, Clock, CheckCircle2, ChevronRight, Plus, StickyNote, HelpCircle, 
  FileSpreadsheet, RefreshCw, User, Menu, Search, Bell, X, ChevronDown
} from "lucide-react";
import { supabase } from "./lib/supabase";

// Components
import NotesWidget from "./components/NotesWidget";
import BuyersManager from "./components/BuyersManager";
import SuppliersManager from "./components/SuppliersManager";
import InventoryManager from "./components/InventoryManager";
import QuotationsManager from "./components/QuotationsManager";
import InvoicesManager from "./components/InvoicesManager";
import ReportsManager from "./components/ReportsManager";
import SettingsManager from "./components/SettingsManager";

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("pavan_auth") === "true";
  });

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  // Active Menu Tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "buyers" | "suppliers" | "inventory" | "quotations" | "invoices" | "reports" | "settings" | "logs"
  >("dashboard");

  // Navigation & Responsiveness States
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isNotesPopupOpen, setIsNotesPopupOpen] = useState<boolean>(false);
  const [isNotifPopupOpen, setIsNotifPopupOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);

  // Handle Android back button or browser back button when mobile menu is open
  useEffect(() => {
    const handlePopState = () => {
      if (isMobileOpen) {
        setIsMobileOpen(false);
        // Prevent going back by pushing current path again
        window.history.pushState(null, "", window.location.pathname);
      }
    };
    if (isMobileOpen) {
      window.history.pushState(null, "", window.location.pathname);
      window.addEventListener("popstate", handlePopState);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobileOpen]);

  // Core Data State
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerLedgerEntries, setBuyerLedgerEntries] = useState<BuyerLedgerEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    companyName: "Pavan Enterprises",
    address: "Plot No. 12, Industrial Area, Sector 4, Gandhinagar, Gujarat, India - 382010",
    phone: "+91 98765 43210",
    email: "info@pavanenterprises.com",
    website: "pavanenterprises.com",
    bankName: "State Bank of India",
    bankAccount: "300412891223",
    bankIfsc: "SBIN0001043",
    gstIn: "24AAACV1234A1Z5",
    defaultGstRate: 18,
    currency: "₹"
  });
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Derived state lists for ledgers & stock histories
  const [supplierLedgerEntries, setSupplierLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data on mount
  useEffect(() => {
    let active = true;
    const verifyAndFetch = async () => {
      try {
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (active) {
              localStorage.setItem("pavan_auth", "true");
              setIsAuthenticated(true);
              await fetchAllData();
              return;
            }
          }
        }
        
        // Fallback for local session
        if (localStorage.getItem("pavan_auth") === "true") {
          if (active) {
            setIsAuthenticated(true);
            await fetchAllData();
          }
        } else {
          if (active) {
            localStorage.removeItem("pavan_auth");
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("Auth session sync failed:", e);
        if (localStorage.getItem("pavan_auth") === "true") {
          if (active) {
            setIsAuthenticated(true);
            await fetchAllData();
          }
        } else {
          if (active) {
            localStorage.removeItem("pavan_auth");
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        }
      }
    };

    if (isAuthenticated) {
      verifyAndFetch();
    } else {
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [buyersRes, buyerLedgerRes, suppliersRes, materialsRes, quotesRes, invoicesRes, notesRes, settingsRes, logsRes] = await Promise.all([
        fetch("/api/buyers").then(r => r.json()),
        fetch("/api/buyer-ledger").then(r => r.json()),
        fetch("/api/suppliers").then(r => r.json()),
        fetch("/api/materials").then(r => r.json()),
        fetch("/api/quotations").then(r => r.json()),
        fetch("/api/invoices").then(r => r.json()),
        fetch("/api/notes").then(r => r.json()),
        fetch("/api/settings").then(r => r.json()),
        fetch("/api/logs").then(r => r.json())
      ]);

      setBuyers(buyersRes.buyers || []);
      setBuyerLedgerEntries(buyerLedgerRes.ledger || []);
      setSuppliers(suppliersRes.suppliers || []);
      setMaterials(materialsRes.materials || []);
      setQuotations(quotesRes.quotations || []);
      setInvoices(invoicesRes.invoices || []);
      setNotes(notesRes.notes || []);
      if (settingsRes && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
      setLogs(logsRes.logs || []);

      // Build supplier ledger and stock logs
      deriveSubLedgers(suppliersRes.suppliers || [], materialsRes.materials || [], invoicesRes.invoices || []);
    } catch (err) {
      console.error("Failed to fetch server database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to derive chronological historical logs
  const deriveSubLedgers = (sups: Supplier[], mats: Material[], invs: Invoice[]) => {
    // 1. Supplier ledger logs
    const supEntries: SupplierLedgerEntry[] = [];
    sups.forEach(s => {
      // Opening balance
      supEntries.push({
        id: `op-${s.id}`,
        supplierId: s.id,
        date: "2026-01-01",
        type: "opening",
        referenceId: "OP-001",
        description: "Opening Outstanding Liability Balance",
        amount: s.outstandingPayable,
        balanceAfter: s.outstandingPayable
      });
    });
    setSupplierLedgerEntries(supEntries);

    // 2. Stock logs
    const adjustments: StockAdjustment[] = [];
    mats.forEach(m => {
      adjustments.push({
        id: `init-${m.id}`,
        materialId: m.id,
        date: "2026-01-01",
        type: "reconcile",
        quantity: m.currentStock,
        description: "Initial Catalog Registration Audit Count"
      });
    });

    // Subdispatches from invoices
    invs.forEach(inv => {
      inv.items.forEach(it => {
        adjustments.push({
          id: `disp-${inv.id}-${it.materialId}`,
          materialId: it.materialId,
          date: inv.date,
          type: "remove",
          quantity: it.quantity,
          description: `Dispatched for Invoice ${inv.invoiceNumber}`
        });
      });
    });

    setStockAdjustments(adjustments);
  };

  // Auth Submit
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setAuthError("Please enter your email address first.");
      setResetSuccess("");
      return;
    }
    setIsResetting(true);
    setAuthError("");
    setResetSuccess("");
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) {
          setAuthError(error.message);
        } else {
          setResetSuccess("Password reset instructions sent to your email.");
        }
      } else {
        setAuthError("Password reset is not available in local/offline mode.");
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError("");
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });
          if (data.session) {
            localStorage.setItem("pavan_auth", "true");
            setIsAuthenticated(true);
            setAuthError("");
            setIsLoggingIn(false);
            return;
          } else if (error) {
            console.warn("Supabase login rejected, checking local fallback:", error.message);
          }
        } catch (supErr) {
          console.warn("Supabase connection failed, checking local fallback:", supErr);
        }
      }

      // Local fallback bypass credentials
      if (email.trim() === "admin@pavanenterprises.com" && password === "admin123") {
        localStorage.setItem("pavan_auth", "true");
        setIsAuthenticated(true);
        setAuthError("");
      } else {
        setAuthError("Invalid credentials. Try using admin@pavanenterprises.com / admin123");
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("pavan_auth");
    setIsAuthenticated(false);
  };

  // --- API Mutators ---
  const saveLogs = async (action: string, module: string, details: string) => {
    try {
      const newLog: Omit<ActivityLog, "id" | "timestamp"> = {
        action,
        module,
        details
      };
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog)
      });
      const updatedLogsRes = await res.json();
      setLogs(updatedLogsRes.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Settings
  const handleSaveSettings = async (updatedSettings: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessGstin: string;
    gstRate: number;
    currency: string;
    qrCodeUrl?: string;
  }) => {
    try {
      const payload = {
        companyName: updatedSettings.businessName,
        address: updatedSettings.businessAddress,
        phone: updatedSettings.businessPhone,
        gstIn: updatedSettings.businessGstin,
        defaultGstRate: updatedSettings.gstRate,
        currency: updatedSettings.currency,
        qrCodeUrl: updatedSettings.qrCodeUrl !== undefined ? updatedSettings.qrCodeUrl : settings.qrCodeUrl
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
      saveLogs("Update", "Settings", "Updated global business parameters and tax ratios");
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Buyers CRUD
  const handleAddBuyer = async (buyerData: Omit<Buyer, "id">) => {
    try {
      const res = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buyerData)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error code ${res.status}`);
      }

      await fetchAllData();
      saveLogs("Create", "Buyers", `Registered client account ${buyerData.name}`);
      showToast(`Successfully registered buyer: ${buyerData.name}`, "success");
    } catch (e: any) {
      console.error("Failed to add buyer:", e);
      showToast(e.message || "Failed to add buyer. Please check server logs.", "error");
    }
  };

  const handleUpdateBuyer = async (id: string, updates: Partial<Buyer>) => {
    try {
      const res = await fetch(`/api/buyers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error code ${res.status}`);
      }

      await fetchAllData();
      saveLogs("Update", "Buyers", `Modified company details for ${updates.name || id}`);
      showToast("Buyer details updated successfully.", "success");
    } catch (e: any) {
      console.error("Failed to update buyer:", e);
      showToast(e.message || "Failed to update buyer.", "error");
    }
  };

  const handleDeleteBuyer = async (id: string) => {
    try {
      const res = await fetch(`/api/buyers/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error code ${res.status}`);
      }

      await fetchAllData();
      saveLogs("Delete", "Buyers", `Purged client account ID ${id}`);
      showToast("Buyer deleted successfully.", "success");
    } catch (e: any) {
      console.error("Failed to delete buyer:", e);
      showToast(e.message || "Failed to delete buyer.", "error");
    }
  };

  // 3. Suppliers CRUD
  const handleAddSupplier = async (supData: Omit<Supplier, "id">) => {
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supData)
      });
      await fetchAllData();
      saveLogs("Create", "Suppliers", `Registered raw material vendor ${supData.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      await fetchAllData();
      saveLogs("Update", "Suppliers", `Modified supplier parameters for ${updates.name || id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      await fetchAllData();
      saveLogs("Delete", "Suppliers", `Removed vendor partner ID ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Material Inventory CRUD
  const handleAddMaterial = async (matData: Omit<Material, "id">) => {
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matData)
      });
      await fetchAllData();
      saveLogs("Create", "Inventory", `Added material ${matData.name} to catalogue`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<Material>) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      await fetchAllData();
      saveLogs("Update", "Inventory", `Updated parameters for material catalog spec ${updates.name || id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      await fetchAllData();
      saveLogs("Delete", "Inventory", `Removed item ID ${id} from catalog`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjustStock = async (id: string, adj: { type: "add" | "remove" | "reconcile"; quantity: number; description: string }) => {
    try {
      const res = await fetch(`/api/materials/${id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adj)
      });
      await fetchAllData();
      saveLogs("Adjustment", "Inventory", `Adjusted stock for item ${id}: ${adj.type} ${adj.quantity} units`);
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Quotation CRUD
  const handleAddQuotation = async (qData: Omit<Quotation, "id" | "quoteNumber">) => {
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qData)
      });
      await fetchAllData();
      saveLogs("Create", "Quotations", "Drafted custom deal quotation sheet");
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateQuotation = async (id: string, updates: Partial<Quotation>) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      await fetchAllData();
      saveLogs("Update", "Quotations", `Modified quotation ${id} status to ${updates.status}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvertQuotation = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, { method: "POST" });
      await fetchAllData();
      saveLogs("Convert", "Quotations", `Converted quotation ${id} to active Invoice`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
      await fetchAllData();
      saveLogs("Delete", "Quotations", `Removed proposal quotation ID ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  // 6. Invoices CRUD
  const handleAddInvoice = async (invData: Omit<Invoice, "id" | "invoiceNumber">) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invData)
      });
      await fetchAllData();
      saveLogs("Create", "Invoices", "Logged active sales invoice & dispatched stock items");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPayment = async (id: string, payment: { amount: number; method: string; referenceNo?: string; notes?: string }) => {
    try {
      const res = await fetch(`/api/invoices/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment)
      });
      await fetchAllData();
      saveLogs("Payment", "Invoices", `Cleared outstanding ${settings.currency}${payment.amount} using ${payment.method} on invoice ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAttachment = async (id: string, attachment: Omit<Attachment, "id" | "uploadedAt">) => {
    try {
      const res = await fetch(`/api/invoices/${id}/attachment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachment)
      });
      await fetchAllData();
      saveLogs("Attachment", "Invoices", `Uploaded custom document attachment to invoice ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicateInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
      await fetchAllData();
      saveLogs("Duplicate", "Invoices", `Duplicated invoice parameters from template ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      await fetchAllData();
      saveLogs("Delete", "Invoices", `Purged invoice ID ${id}, reversed balance, and restored stock balance`);
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Notes CRUD
  const handleAddNote = async (noteData: Omit<DashboardNote, "id" | "createdAt">) => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteData)
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<DashboardNote>) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Wipe
  const handleWipeDatabase = async () => {
    try {
      await fetch("/api/wipe", { method: "POST" });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- Financial Dashboard calculations ---
  const todaySales = (() => {
    const today = new Date().toISOString().split("T")[0];
    return invoices
      .filter(inv => inv.date === today)
      .reduce((sum, inv) => sum + inv.total, 0);
  })();

  const monthlySales = (() => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    return invoices
      .filter(inv => inv.date.startsWith(currentMonth))
      .reduce((sum, inv) => sum + inv.total, 0);
  })();

  const totalOutstandingReceivables = buyers.reduce((sum, b) => sum + b.balance, 0);
  const totalOutstandingPayables = suppliers.reduce((sum, s) => sum + s.outstandingPayable, 0);
  const grossSalesTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);

  // Quick Action Wizards
  const triggerQuickInvoice = () => {
    setActiveTab("invoices");
  };

  const triggerQuickQuote = () => {
    setActiveTab("quotations");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-milky flex flex-col items-center justify-center font-sans text-xs">
        <div className="p-8 text-center glass-card rounded-2xl max-w-sm space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="font-bold text-charcoal uppercase tracking-widest text-[10px]">Verifying Pavan Ledger Vault...</p>
          <p className="text-stone font-semibold leading-relaxed">Reading persistent local disk database blocks. Please wait.</p>
        </div>
      </div>
    );
  }

  // AUTH WALL GUEST SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background-milky flex flex-col items-center justify-center p-4 font-sans text-xs">
        <div className="glass-card max-w-sm w-full overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="p-6 bg-primary text-card-soft text-center flex flex-col items-center justify-center space-y-2">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDqjlC1GmAQ71cveIBWJUQbgaI23as2k9VstUR_Pbujx7VstUR_Pbujx7Vf0kVtguzY04&s=10" 
              alt="Pavan Logo"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full border border-card-soft/20 shadow-md object-cover"
            />
            <div>
              <h1 className="text-xl font-bold font-display uppercase tracking-widest text-card-soft">PAVAN LEDGER</h1>
              <p className="text-[10px] text-card-soft/80 font-medium">Secure Admin Single-User Micro ERP portal</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {authError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-stone uppercase mb-1">Email Address</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone/60" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@pavanenterprises.com" 
                  className="w-full pl-9 pr-3 py-2 border border-border-sand bg-card-soft/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-charcoal text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone uppercase mb-1">Admin Access Password</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone/60" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-9 pr-3 py-2 border border-border-sand bg-card-soft/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-charcoal text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end text-[10px] pt-1">
              <button 
                type="button" 
                disabled={isResetting}
                onClick={handleResetPassword}
                className="text-primary-dark hover:underline disabled:opacity-50 font-bold"
              >
                {isResetting ? "Sending..." : "Forgot Password?"}
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:bg-primary/70 text-card-soft font-bold rounded-lg shadow-md uppercase tracking-wider text-xs transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Ledger Credentials"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // COMPILATION LAYOUT
  return (
    <div className="min-h-screen bg-background-milky flex font-sans text-xs antialiased print:bg-white overflow-hidden">
      
      {/* Mobile Drawer Backdrop overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}

      {/* Responsive Left Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 transition-all duration-300 ease-in-out bg-primary border-r border-black/5 text-card-soft flex flex-col justify-between p-4 shrink-0 no-print shadow-xl md:shadow-none h-full
          ${isMobileOpen ? "translate-x-0 w-[80%] sm:w-[280px]" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-[72px]" : "md:w-[280px]"}
        `}
      >
        {/* Top Section: Branding, Logo and Collapse Trigger */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-card-soft/10">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="bg-card-soft p-1 rounded-xl text-primary shadow-sm font-bold shrink-0 transition-transform hover:scale-[1.05] hover:rotate-3 duration-200 overflow-hidden">
                <img 
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDqjlC1GmAQ71cveIBWJUQbgaI23as2k9VstUR_Pbujx7Vf0kVtguzY04&s=10" 
                  alt="Pavan Logo"
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-lg object-cover"
                />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0 flex-1 animate-fade-in">
                  <h2 className="font-extrabold tracking-widest text-[12px] font-display uppercase text-card-soft">PAVAN LEDGER</h2>
                  <p className="text-[9px] text-card-soft/75 font-medium truncate">{settings.companyName}</p>
                </div>
              )}
            </div>
            
            {/* Collapse button for md/lg displays */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1 bg-card-soft/10 hover:bg-card-soft/20 rounded-lg text-card-soft transition-all duration-200"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`} />
            </button>
          </div>

          {/* Navigation List */}
          <p className={`px-2 text-[8px] font-extrabold tracking-widest text-card-soft/50 uppercase ${isCollapsed && !isMobileOpen ? "text-center" : ""}`}>
            {isCollapsed && !isMobileOpen ? "Menu" : "General Options"}
          </p>

          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "buyers", label: "Buyers", icon: Users },
              { id: "suppliers", label: "Suppliers", icon: Factory },
              { id: "invoices", label: "Invoices", icon: CreditCard },
              { id: "quotations", label: "Quotations", icon: FileText },
              { id: "inventory", label: "Raw Material Inventory", icon: Boxes },
              { id: "catalog", label: "Material Catalog", icon: FileSpreadsheet },
              { id: "reports", label: "Reports", icon: BarChart3 },
              { id: "settings", label: "Settings", icon: Settings }
            ].map(item => {
              const IconComp = item.icon;
              const isSelected = activeTab === item.id || (item.id === "catalog" && activeTab === "inventory");

              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => {
                      if (item.id === "catalog") {
                        setActiveTab("inventory");
                      } else {
                        setActiveTab(item.id as any);
                      }
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all text-left group hover:scale-[1.01] hover:-translate-y-[0.5px] duration-200 relative ${
                      isSelected 
                        ? "bg-[#D4C9BA] text-[#1C1C1E] shadow-sm font-extrabold" 
                        : "text-[#D4C9BA]/85 hover:text-[#D4C9BA] hover:bg-[rgba(212,201,186,0.15)]"
                    }`}
                  >
                    {/* Left Accent indicator for active item */}
                    {isSelected && (
                      <div className="absolute left-1 top-2.5 bottom-2.5 w-1 bg-[#1C1C1E] rounded-r-md animate-pulse" />
                    )}

                    <IconComp className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1 duration-200" />
                    
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>

                  {/* Tooltip for collapsed mode on md screens */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-charcoal text-[#D4C9BA] text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Add with collapsible menu in sidebar */}
            <div className="relative group border-t border-card-soft/10 pt-2 mt-2">
              <button
                onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left text-card-soft/85 hover:text-card-soft hover:bg-[rgba(212,201,186,0.15)] hover:scale-[1.01] duration-200`}
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-4 h-4 shrink-0 bg-[#D4C9BA]/20 p-0.5 rounded-full" />
                  {(!isCollapsed || isMobileOpen) && <span>Quick Add</span>}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isQuickAddOpen ? "rotate-180" : ""}`} />
                )}
              </button>

              {/* Collapsed menu mini float or inline list */}
              {isCollapsed && !isMobileOpen ? (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-charcoal text-[#D4C9BA] text-[9px] font-extrabold p-2 rounded-xl shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 flex flex-col gap-1.5 pointer-events-auto">
                  <p className="border-b border-card-soft/15 pb-1 mb-1 text-[#D4C9BA]/60">Quick Actions</p>
                  <button onClick={() => { setActiveTab("invoices"); setIsMobileOpen(false); }} className="hover:text-[#D4C9BA]/80 transition-colors text-left font-bold text-[9px]">+ Invoice</button>
                  <button onClick={() => { setActiveTab("quotations"); setIsMobileOpen(false); }} className="hover:text-[#D4C9BA]/80 transition-colors text-left font-bold text-[9px]">+ Quotation</button>
                  <button onClick={() => { setActiveTab("buyers"); setIsMobileOpen(false); }} className="hover:text-[#D4C9BA]/80 transition-colors text-left font-bold text-[9px]">+ Buyer</button>
                  <button onClick={() => { setActiveTab("suppliers"); setIsMobileOpen(false); }} className="hover:text-[#D4C9BA]/80 transition-colors text-left font-bold text-[9px]">+ Supplier</button>
                </div>
              ) : (
                isQuickAddOpen && (
                  <div className="pl-6 pr-2 py-1.5 space-y-1 animate-fade-in flex flex-col gap-0.5">
                    <button 
                      onClick={() => { setActiveTab("invoices"); }}
                      className="w-full text-left text-[10px] py-1 text-card-soft/85 hover:text-card-soft font-bold flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4C9BA]" /> New Invoice
                    </button>
                    <button 
                      onClick={() => { setActiveTab("quotations"); }}
                      className="w-full text-left text-[10px] py-1 text-card-soft/85 hover:text-card-soft font-bold flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4C9BA]" /> New Quotation
                    </button>
                    <button 
                      onClick={() => { setActiveTab("buyers"); }}
                      className="w-full text-left text-[10px] py-1 text-card-soft/85 hover:text-card-soft font-bold flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4C9BA]" /> New Buyer
                    </button>
                    <button 
                      onClick={() => { setActiveTab("suppliers"); }}
                      className="w-full text-left text-[10px] py-1 text-card-soft/85 hover:text-card-soft font-bold flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4C9BA]" /> New Supplier
                    </button>
                  </div>
                )
              )}
            </div>
          </nav>
        </div>

        {/* Bottom Section: Admin Profile Card */}
        <div className={`mt-auto border-t border-card-soft/10 pt-4 ${isCollapsed && !isMobileOpen ? "flex flex-col items-center gap-3" : "space-y-3"}`}>
          <div className={`flex items-center ${isCollapsed && !isMobileOpen ? "justify-center" : "gap-3"} min-w-0`}>
            {/* Avatar initials badge */}
            <div className="w-9 h-9 rounded-full bg-[#D4C9BA] text-[#1C1C1E] font-extrabold flex items-center justify-center text-xs border border-white/10 shadow-sm shrink-0">
              AD
            </div>
            
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1 animate-fade-in">
                <h4 className="font-extrabold text-[11px] text-card-soft leading-none truncate">Admin Owner</h4>
                <p className="text-[9px] text-card-soft/75 mt-1 leading-none truncate font-medium">{settings.companyName}</p>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobileOpen) ? (
            <button 
              onClick={handleLogout}
              className="w-full py-1.5 bg-card-soft/15 hover:bg-card-soft/25 text-card-soft font-bold rounded-xl flex items-center justify-center gap-1.5 text-[10px] transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out Session
            </button>
          ) : (
            <button 
              onClick={handleLogout}
              className="p-2 bg-card-soft/15 hover:bg-card-soft/25 text-card-soft font-bold rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.98]"
              title="Log Out Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top App Bar Header with Search, Memos, and Notifications popups */}
        <header className="h-14 bg-primary border-b border-white/10 text-card-soft flex items-center justify-between px-5 shrink-0 no-print z-30 relative shadow-md">
          <div className="flex items-center gap-3">
            {/* ☰ Burger Menu trigger on mobile */}
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-card-soft transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5 text-card-soft" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-card-soft text-sm uppercase tracking-wider font-display">
                {activeTab === "dashboard" ? "Control Dashboard" :
                 activeTab === "buyers" ? "Buyers Ledger" :
                 activeTab === "suppliers" ? "Suppliers Ledger" :
                 activeTab === "inventory" ? "Material Catalog" :
                 activeTab === "quotations" ? "Quotations Sheet" :
                 activeTab === "invoices" ? "Tax Invoices" :
                 activeTab === "reports" ? "System Reports" :
                 activeTab === "settings" ? "Ledger Settings" : "System Logs"}
              </h1>
              <span className="hidden sm:inline px-2 py-0.5 bg-white/10 text-card-soft font-extrabold rounded-full text-[9px] uppercase">
                PAVAN ERP
              </span>
            </div>
          </div>

          {/* Middle Section: Global Search */}
          <div className="flex-1 max-w-xs mx-4 hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-card-soft/80 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Global ledger lookup..."
                className="w-full pl-9 pr-3 py-1.5 border border-white/10 bg-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-card-soft font-bold text-card-soft text-[11px] placeholder:text-card-soft/60"
              />
            </div>
          </div>

          {/* Right Section: popups of notes and alerts */}
          <div className="flex items-center gap-2.5">
            
            {/* Notes Indicator */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotesPopupOpen(!isNotesPopupOpen);
                  setIsNotifPopupOpen(false);
                }}
                className={`p-2 rounded-xl transition-all relative duration-200 ${isNotesPopupOpen ? "bg-card-soft text-primary shadow-sm" : "bg-white/10 hover:bg-white/20 text-card-soft"}`}
                title="Administrative Memo Notes"
              >
                <StickyNote className="w-4 h-4" />
                {notes.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-primary font-extrabold text-[8px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {notes.length}
                  </span>
                )}
              </button>

              {/* Compact Notes Popover */}
              {isNotesPopupOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotesPopupOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 dialog-glass p-4 rounded-2xl shadow-xl z-40 animate-fade-in text-charcoal space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-border-sand/40">
                      <h4 className="font-extrabold text-xs text-charcoal uppercase">Administrative Memos</h4>
                      <span className="text-[8px] uppercase font-bold text-stone/60">{notes.length} pinned</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar pr-0.5">
                      <NotesWidget 
                        notes={notes}
                        onAddNote={handleAddNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notification Alerts Indicator */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifPopupOpen(!isNotifPopupOpen);
                  setIsNotesPopupOpen(false);
                }}
                className={`p-2 rounded-xl transition-all relative duration-200 ${isNotifPopupOpen ? "bg-card-soft text-primary shadow-sm" : "bg-white/10 hover:bg-white/20 text-card-soft"}`}
                title="System Notifications"
              >
                <Bell className="w-4 h-4" />
                {logs.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[8px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {Math.min(9, logs.length)}
                  </span>
                )}
              </button>

              {/* Compact Notifications Popover */}
              {isNotifPopupOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotifPopupOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 dialog-glass p-4 rounded-2xl shadow-xl z-40 animate-fade-in text-charcoal space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-border-sand/40">
                      <h4 className="font-extrabold text-xs text-charcoal uppercase">Audit Activity Trail</h4>
                      <button 
                        onClick={() => { setActiveTab("logs"); setIsNotifPopupOpen(false); }}
                        className="text-[9px] font-extrabold text-primary-dark hover:underline uppercase"
                      >
                        View Logs
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2.5 no-scrollbar">
                      {logs.length === 0 ? (
                        <p className="text-stone text-center py-4">No audit trails recorded.</p>
                      ) : (
                        logs.slice(0, 5).map(log => (
                          <div key={log.id} className="p-2 bg-primary/5 border border-border-sand/20 rounded-xl text-[10px] flex gap-2 items-start">
                            <span className="text-xs shrink-0 mt-0.5">🔔</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-charcoal text-[10px] leading-tight">{log.action}: {log.details}</p>
                              <p className="text-[8px] text-stone font-mono mt-0.5">{log.timestamp}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Session Account Info */}
            <div className="hidden lg:flex flex-col text-right pl-2 border-l border-border-sand/50">
              <span className="font-extrabold text-primary uppercase tracking-widest text-[8px]">Owner GSTIN</span>
              <span className="font-mono text-stone text-[9px] font-bold">{settings.gstIn}</span>
            </div>
          </div>
        </header>

        {/* Main Content scroll window */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 no-scrollbar w-full max-w-[1400px] mx-auto">
          
          {/* DASHBOARD MODULE */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Top stat indices bento grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 no-print">
                {/* Card 1: Today's Sales */}
                <div className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-caps text-label-caps text-stone uppercase tracking-wider">Today's Sales</span>
                    <div className="p-1.5 bg-primary/15 text-primary-dark rounded-full shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display-sm text-display-sm text-primary-dark font-extrabold tracking-tight font-mono">
                      {settings.currency}{todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </h2>
                    <span className="text-[10px] text-primary-dark flex items-center font-bold mt-1">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> Active dispatches today
                    </span>
                  </div>
                </div>

                {/* Card 2: Monthly Sales */}
                <div className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-caps text-label-caps text-stone uppercase tracking-wider">Monthly Sales</span>
                    <div className="p-1.5 bg-primary/15 text-primary-dark rounded-full shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display-sm text-display-sm text-charcoal font-extrabold tracking-tight font-mono">
                      {settings.currency}{monthlySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </h2>
                    <span className="text-[10px] text-primary-dark flex items-center font-bold mt-1">
                      Current month total sales
                    </span>
                  </div>
                </div>

                {/* Card 3: Outstanding Receivables */}
                <div className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-caps text-label-caps text-stone uppercase tracking-wider">Receivables</span>
                    <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-full shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display-sm text-display-sm text-rose-600 font-extrabold tracking-tight font-mono">
                      {settings.currency}{totalOutstandingReceivables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </h2>
                    <div className="w-full bg-border-sand/40 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-rose-500 h-full w-[70%]" />
                    </div>
                  </div>
                </div>

                {/* Card 4: Outstanding Payables */}
                <div className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-caps text-label-caps text-stone uppercase tracking-wider">Payables</span>
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-full shrink-0">
                      <Factory className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-display-sm text-display-sm text-amber-600 font-extrabold tracking-tight font-mono">
                      {settings.currency}{totalOutstandingPayables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </h2>
                    <div className="w-full bg-border-sand/40 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full w-[35%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Static SVG Analytics row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 no-print">
                {/* Graph Card */}
                <div className="glass-card rounded-2xl p-5 md:col-span-8 flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-sand/30">
                    <div>
                      <h4 className="font-bold text-charcoal text-xs font-display uppercase tracking-wider">Turnover Sales Performance Matrix</h4>
                      <p className="text-[9px] text-stone mt-0.5">Chronological invoice values generated over the current period</p>
                    </div>
                    <span className="text-primary-dark font-bold text-[10px] uppercase">Real-Time Ledger</span>
                  </div>

                  {/* Responsive Clean SVG Bar Chart */}
                  <div className="flex-1 flex items-end justify-between h-44 border-b border-border-sand/40 pb-2 font-mono text-[9px] text-stone">
                    {invoices.length === 0 ? (
                      <div className="w-full text-center py-10 text-stone font-medium font-sans">
                        No transactions logged to populate performance analytics.
                      </div>
                    ) : (
                      invoices.slice(-7).map((inv, idx) => {
                        const percentHeight = Math.min(100, Math.max(10, (inv.total / (grossSalesTotal || 1)) * 140));
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
                            <span className="hidden group-hover:block bg-charcoal text-card-soft font-bold p-1 rounded font-mono text-[8px] absolute -translate-y-8">
                              {settings.currency}{inv.total.toLocaleString()}
                            </span>
                            <div 
                              style={{ height: `${percentHeight}px` }} 
                              className="w-8 bg-primary hover:bg-primary-dark rounded-t transition-all shadow-sm duration-200"
                            />
                            <span className="truncate max-w-[45px] text-[8px]">{inv.invoiceNumber}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick actions wizard */}
                <div className="glass-card rounded-2xl p-5 md:col-span-4 space-y-3">
                  <h4 className="font-bold text-charcoal text-xs font-display uppercase tracking-wider border-b border-border-sand/30 pb-2">
                    Commercial Quick Actions
                  </h4>

                  <button 
                    onClick={triggerQuickInvoice}
                    className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded shadow-md flex items-center justify-center gap-2 text-[10px] uppercase font-display transition-transform active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" /> Dispatch material Invoice
                  </button>

                  <button 
                    onClick={triggerQuickQuote}
                    className="w-full py-2.5 bg-charcoal hover:bg-charcoal/90 text-card-soft font-bold rounded shadow-md flex items-center justify-center gap-2 text-[10px] uppercase font-display transition-transform active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" /> Draft Client Deal Quote
                  </button>

                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center gap-2 text-[10px] text-primary-dark font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Always ensure material stocks are updated.</span>
                  </div>
                </div>
              </div>

              {/* Notes Widget & Recent activities */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Notes Widget (takes 7 columns) */}
                <div className="md:col-span-7 glass-card rounded-2xl p-5">
                  <div className="flex justify-between items-center pb-2 border-b border-border-sand/30 mb-3">
                    <h4 className="font-bold text-charcoal text-xs font-display uppercase tracking-wider font-semibold">Administrative Memo Notepad</h4>
                    <span className="px-2 py-0.5 bg-primary/15 text-primary-dark font-bold rounded-full text-[9px] uppercase">
                      Pinned memos
                    </span>
                  </div>
                  <NotesWidget 
                    notes={notes}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                  />
                </div>

                {/* Recent Activities (takes 5 columns) */}
                <div className="md:col-span-5 glass-card rounded-2xl p-5 flex flex-col h-full">
                  <div className="flex justify-between items-center pb-2 border-b border-border-sand/30 mb-3">
                    <h4 className="font-bold text-charcoal text-xs font-display uppercase tracking-wider font-semibold">Historical Audit Logs</h4>
                    <button 
                      onClick={() => setActiveTab("logs")}
                      className="text-primary-dark hover:underline font-bold text-[10px]"
                    >
                      View All
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px]">
                    {logs.length === 0 ? (
                      <p className="text-stone py-6 text-center">No activities recorded in the ledger yet.</p>
                    ) : (
                      logs.slice(0, 5).map(log => (
                        <div key={log.id} className="p-2.5 bg-card-soft/30 border border-border-sand/40 rounded-xl text-[10px] flex gap-2.5 items-start">
                          <span className="text-xs shrink-0">🔔</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-charcoal">{log.action}: {log.details}</p>
                            <p className="text-[8px] text-stone font-mono mt-0.5">{log.timestamp} • {log.module}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* BUYERS MODULE */}
          {activeTab === "buyers" && (
            <BuyersManager 
              buyers={buyers}
              ledgerEntries={buyerLedgerEntries}
              onAddBuyer={handleAddBuyer}
              onUpdateBuyer={handleUpdateBuyer}
              onDeleteBuyer={handleDeleteBuyer}
              currency={settings.currency}
            />
          )}

          {/* SUPPLIERS MODULE */}
          {activeTab === "suppliers" && (
            <SuppliersManager 
              suppliers={suppliers}
              ledgerEntries={supplierLedgerEntries}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              currency={settings.currency}
            />
          )}

          {/* INVENTORY CATALOGUE MODULE */}
          {activeTab === "inventory" && (
            <InventoryManager 
              materials={materials}
              adjustments={stockAdjustments}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onAdjustStock={handleAdjustStock}
              currency={settings.currency}
            />
          )}

          {/* QUOTATIONS MODULE */}
          {activeTab === "quotations" && (
            <QuotationsManager 
              quotations={quotations}
              buyers={buyers}
              materials={materials}
              onAddQuotation={handleAddQuotation}
              onUpdateQuotation={handleUpdateQuotation}
              onConvertQuotation={handleConvertQuotation}
              onDeleteQuotation={handleDeleteQuotation}
              currency={settings.currency}
              defaultGstRate={settings.defaultGstRate}
            />
          )}

          {/* INVOICES MODULE */}
          {activeTab === "invoices" && (
            <InvoicesManager 
              invoices={invoices}
              buyers={buyers}
              materials={materials}
              suppliers={suppliers}
              onAddInvoice={handleAddInvoice}
              onAddPayment={handleAddPayment}
              onAddAttachment={handleAddAttachment}
              onDuplicateInvoice={handleDuplicateInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              currency={settings.currency}
              defaultGstRate={settings.defaultGstRate}
              qrCodeUrl={settings.qrCodeUrl || ""}
              appUrl="http://localhost:3000"
            />
          )}

          {/* REPORTS MODULE */}
          {activeTab === "reports" && (
            <ReportsManager 
              invoices={invoices}
              buyers={buyers}
              suppliers={suppliers}
              materials={materials}
              currency={settings.currency}
            />
          )}

          {/* SETTINGS MODULE */}
          {activeTab === "settings" && (
            <SettingsManager 
              businessName={settings.companyName}
              businessAddress={settings.address}
              businessPhone={settings.phone}
              businessGstin={settings.gstIn}
              gstRate={settings.defaultGstRate}
              currency={settings.currency}
              qrCodeUrl={settings.qrCodeUrl || ""}
              onSaveSettings={handleSaveSettings}
              onWipeDatabase={handleWipeDatabase}
            />
          )}

          {/* AUDIT TRAIL LOGS MODULE */}
          {activeTab === "logs" && (
            <div className="glass-card rounded-xl overflow-hidden shadow-sm flex flex-col h-full font-sans">
              <div className="p-4 border-b border-border-sand/30 bg-primary/10">
                <h3 className="font-bold text-charcoal text-xs uppercase tracking-wider font-display">Administrative System Audit Trail Logbook</h3>
                <p className="text-[10px] text-stone mt-0.5">Chronological audit ledger tracing all changes inside invoices, quotes, stock catalog, and buyer accounts.</p>
              </div>

              <div className="p-4 overflow-y-auto max-h-[500px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-primary text-card-soft font-bold uppercase tracking-wider text-[9px] border-b border-border-sand/40">
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Operator</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Module Target</th>
                      <th className="px-4 py-2.5">Modification Logs / Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-sand/20 font-medium text-charcoal text-[11px]">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-primary/5 transition-colors duration-150">
                        <td className="px-4 py-2.5 font-mono text-stone">{log.timestamp}</td>
                        <td className="px-4 py-2.5 font-bold text-charcoal">Admin</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            log.action === "Create" || log.action === "Payment" ? "bg-emerald-500/15 text-emerald-800" :
                            log.action === "Update" ? "bg-amber-500/15 text-amber-800" : "bg-rose-500/15 text-rose-800"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-stone uppercase text-[9px]">{log.module}</td>
                        <td className="px-4 py-2.5 text-charcoal">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Toast Notification HUD */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-lg font-bold flex items-center gap-2.5 transition-all ${
          toast.type === "error" 
            ? "bg-rose-50 border-rose-200 text-rose-800 animate-fade-in" 
            : "bg-emerald-50 border-emerald-200 text-emerald-800 animate-fade-in"
        }`}>
          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span className="text-[11px] font-sans font-semibold leading-normal">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
