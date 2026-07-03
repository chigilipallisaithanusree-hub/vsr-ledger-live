import React, { useState, useEffect } from "react";
import { Buyer, BuyerLedgerEntry } from "../types";
import { 
  Users, Search, Plus, Trash2, Edit2, ChevronRight, FileText, 
  MapPin, Phone, Mail, Award, TrendingUp, AlertTriangle, ArrowLeft,
  X, Check, DollarSign, Calendar, Printer
} from "lucide-react";

interface BuyersManagerProps {
  buyers: Buyer[];
  ledgerEntries: BuyerLedgerEntry[];
  onAddBuyer: (buyer: Omit<Buyer, "id">) => void;
  onUpdateBuyer: (id: string, updates: Partial<Buyer>) => void;
  onDeleteBuyer: (id: string) => void;
  currency: string;
}

export default function BuyersManager({
  buyers,
  ledgerEntries,
  onAddBuyer,
  onUpdateBuyer,
  onDeleteBuyer,
  currency
}: BuyersManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [balance, setBalance] = useState("0");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const selectedBuyer = buyers.find(b => b.id === selectedBuyerId);
  const selectedLedger = ledgerEntries
    .filter(entry => entry.buyerId === selectedBuyerId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filtered buyer list
  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startAdd = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setBalance("0");
    setStatus("active");
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEdit = (buyer: Buyer) => {
    setName(buyer.name);
    setContactPerson(buyer.contactPerson);
    setPhone(buyer.phone);
    setEmail(buyer.email);
    setAddress(buyer.address);
    setGstin(buyer.gstin);
    setBalance(String(buyer.balance));
    setStatus(buyer.status);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name,
      contactPerson,
      phone,
      email,
      address,
      gstin,
      status,
      balance: Number(balance) || 0
    };

    if (isEditing && selectedBuyerId) {
      onUpdateBuyer(selectedBuyerId, data);
      setIsEditing(false);
    } else {
      onAddBuyer(data);
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to completely delete this buyer and their history?")) {
      onDeleteBuyer(id);
      setSelectedBuyerId(null);
    }
  };

  const handlePrint = () => {
    try {
      // Check if running inside iframe sandbox
      const isIframe = window.self !== window.top;
      
      if (!isIframe) {
        try {
          window.print();
          return;
        } catch (e) {
          console.warn("window.print() failed, falling back to Blob download", e);
        }
      }

      // Blob approach for sandboxed iframes or fallback
      const buyerElement = document.querySelector(".print-buyer-card");
      if (buyerElement) {
        // Filter out any buttons or sidebar items that should not print
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = buyerElement.innerHTML;
        tempDiv.querySelectorAll(".no-print").forEach(el => el.remove());

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Buyer Account Statement - ${selectedBuyer?.name || "Customer"}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              body { font-family: sans-serif; background: white; color: #1c1917; padding: 40px; }
              .no-print { display: none !important; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 11px; }
              th { background-color: #f7fafc; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="max-w-4xl mx-auto">
              ${tempDiv.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
          </html>
        `;
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Buyer_Statement_${selectedBuyer?.name.replace(/\s+/g, "_") || "Customer"}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Printable element .print-buyer-card not found");
      }
    } catch (err) {
      console.error("PDF generation or print triggered error: ", err);
      alert("Export/Print encountered an issue. For best results, please open the application in a new tab (using the button in the top right) and click print, or use Ctrl+P / Cmd+P directly.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-full text-xs animate-fade-in">
      
      {/* Buyers Master List Side Column */}
      <div className={`col-span-12 ${selectedBuyerId ? "md:col-span-4 hidden md:block no-print" : "md:col-span-12"} glass-card rounded-2xl p-4 md:p-6 flex flex-col h-full`}>
        {/* Search header & add */}
        <div className="p-3.5 border-b border-border-sand/30 bg-card-soft/40 flex items-center justify-between">
          <div className="relative flex-1 mr-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/60" />
            <input 
              type="text" 
              placeholder="Filter buyers..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-card-soft/60 border border-border-sand rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>
          <button 
            onClick={startAdd}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1 shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Buyer
          </button>
        </div>

        {/* List scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-sand/20 max-h-[600px] no-scrollbar">
          {filteredBuyers.length === 0 ? (
            <div className="p-8 text-center text-stone">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone" />
              <p className="font-bold">No buyers registered</p>
            </div>
          ) : (
            filteredBuyers.map(b => (
              <div 
                key={b.id}
                onClick={() => { setSelectedBuyerId(b.id); setIsAdding(false); setIsEditing(false); }}
                className={`p-3.5 cursor-pointer flex items-center justify-between transition-all ${
                  selectedBuyerId === b.id ? "bg-primary/10 border-r-4 border-r-primary-dark" : "hover:bg-card-soft/30"
                }`}
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-charcoal truncate">{b.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      b.status === "active" ? "bg-primary/20 text-primary-dark" : "bg-card-soft/80 text-stone"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-stone font-semibold truncate mt-0.5">Contact: {b.contactPerson || "None"}</p>
                  <p className="text-stone/70 font-mono text-[10px] mt-0.5">{b.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold text-stone uppercase tracking-wider">Balance Due</p>
                  <p className={`font-extrabold text-sm font-mono ${b.balance > 0 ? "text-rose-600" : "text-primary-dark"}`}>
                    {currency}{b.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Buyer Detail, Forms or Ledger Drawer */}
      <div className={`col-span-12 ${selectedBuyerId ? "md:col-span-8" : "md:col-span-12 hidden md:flex"} glass-card rounded-2xl p-4 md:p-6 flex flex-col min-h-[500px]`}>
        
        {/* ADD OR EDIT FORM VIEW */}
        {isAdding || isEditing ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 flex flex-col h-full bg-card-soft/10">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-3">
              <h3 className="font-bold text-charcoal text-sm font-display">
                {isAdding ? "Register New Business Customer (Buyer)" : `Edit Profile: ${selectedBuyer?.name}`}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                className="p-1.5 text-stone hover:text-charcoal bg-card-soft rounded-lg border border-border-sand/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Company / Business Name *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Mahalaxmi Constructions" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Primary Contact Representative *</label>
                <input 
                  type="text" 
                  required
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  placeholder="e.g., Karan Shah" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Customer Telephone / WhatsApp *</label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g., 9876543210" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Primary Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g., karan@mahalaxmi.com" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Billing & Delivery Address</label>
                <textarea 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, Industrial Phase, City, Zip" 
                  className="w-full px-2.5 py-1.5 h-16 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none resize-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">GST Identification Number (GSTIN)</label>
                <input 
                  type="text" 
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g., 24AAACM1029A1Z1" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Opening Outstanding Balance ({currency})</label>
                <input 
                  type="number" 
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  placeholder="0.00" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Status Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                >
                  <option value="active">Active Business Partner</option>
                  <option value="inactive">Inactive / On Hold</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl shadow-md mt-4 shrink-0 text-xs transition-all active:scale-[0.98]"
            >
              {isAdding ? "Register Buyer Profile" : "Save Modified Details"}
            </button>
          </form>
        ) : selectedBuyer ? (
          /* BUYER DETAILED VIEW + LEDGER SHEET */
          <div className="flex flex-col h-full bg-card-soft/10 print-buyer-card">
            {/* Header / Actions bar */}
            <div className="p-4 border-b border-border-sand/30 bg-card-soft/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedBuyerId(null)} 
                  className="md:hidden p-1.5 bg-card-soft border border-border-sand/30 rounded-xl mr-1 no-print"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-charcoal" />
                </button>
                <div>
                  <h3 className="font-bold text-charcoal text-sm font-display leading-tight">{selectedBuyer.name}</h3>
                  <p className="text-[10px] text-stone font-semibold">Buyer Ledger Sheet • {selectedBuyer.id}</p>
                </div>
              </div>

              <div className="flex gap-1.5 no-print">
                <button 
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 font-bold rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Printer className="w-3.5 h-3.5 text-stone" /> Print Statement
                </button>
                <button 
                  onClick={() => startEdit(selectedBuyer)}
                  className="px-2.5 py-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 font-bold rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-stone" /> Edit Profile
                </button>
                <button 
                  onClick={() => handleDelete(selectedBuyer.id)}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Purge Account
                </button>
              </div>
            </div>

            {/* Profile Fast Stats Card Grid */}
            <div className="p-4 border-b border-border-sand/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-600 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-stone uppercase tracking-widest">Receivable Balance</p>
                  <p className="font-bold text-rose-600 text-sm font-mono">
                    {currency}{selectedBuyer.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary-dark rounded-full">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[9px] font-extrabold text-stone uppercase tracking-widest">Tax ID / GSTIN</p>
                  <p className="font-bold text-charcoal font-mono truncate">{selectedBuyer.gstin || "N/A"}</p>
                </div>
              </div>

              <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary-dark rounded-full">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-stone uppercase tracking-widest">Contact Number</p>
                  <p className="font-bold text-charcoal font-mono">{selectedBuyer.phone}</p>
                </div>
              </div>
            </div>

            {/* Detailed Ledger Sheet Tabs */}
            <div className="flex-1 p-4 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-stone" />
                  <h4 className="font-bold text-charcoal font-display">Chronological Account Statement</h4>
                </div>
                {selectedBuyer.balance > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 font-extrabold rounded-full text-[10px]">
                    <AlertTriangle className="w-3.5 h-3.5" /> High Receivable Risk
                  </span>
                )}
              </div>

              {/* Ledger Table */}
              <div className="flex-1 border border-border-sand/30 rounded-2xl overflow-hidden bg-card-soft/20 shadow-sm">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[10px] border-b border-border-sand/30">
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Txn Type</th>
                        <th className="px-4 py-2.5">Reference</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5 text-right">Debit (Sales)</th>
                        <th className="px-4 py-2.5 text-right">Credit (Receipts)</th>
                        <th className="px-4 py-2.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
                      {selectedLedger.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-stone">
                            No ledger transactions logged. Invoices and payments will populate this list automatically.
                          </td>
                        </tr>
                      ) : (
                        selectedLedger.map((entry, idx) => {
                          const isDebit = entry.type === "invoice" || (entry.type === "opening" && entry.amount > 0);
                          const isCredit = entry.type === "payment";
                          
                          return (
                            <tr key={entry.id} className="hover:bg-card-soft/30 transition-colors">
                              <td className="px-4 py-2 font-mono whitespace-nowrap">{entry.date}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  entry.type === "invoice" ? "bg-rose-500/10 text-rose-600" :
                                  entry.type === "payment" ? "bg-primary/20 text-primary-dark" : "bg-card-soft/80 text-stone"
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono">{entry.referenceId}</td>
                              <td className="px-4 py-2">{entry.description}</td>
                              <td className="px-4 py-2 text-right font-mono text-rose-600">
                                {isDebit ? `${currency}${entry.amount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-primary-dark">
                                {isCredit ? `${currency}${entry.amount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-extrabold text-charcoal">
                                {currency}{entry.balanceAfter.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone text-center bg-card-soft/10">
            <Users className="w-12 h-12 text-stone/40 mb-3 animate-pulse" />
            <h4 className="font-bold text-charcoal font-display">No Buyer Selected</h4>
            <p className="max-w-xs mt-1 text-[11px] font-medium">Select a customer company from the Master Directory on the left to inspect ledger transactions, contacts, and balances.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
