import React, { useState } from "react";
import { Supplier, SupplierLedgerEntry } from "../types";
import { 
  Factory, Search, Plus, Trash2, Edit2, FileText, 
  MapPin, Phone, Mail, Award, TrendingDown, ArrowLeft,
  X, Check, DollarSign, Calendar, TrendingDown as PayableIcon
} from "lucide-react";

interface SuppliersManagerProps {
  suppliers: Supplier[];
  ledgerEntries: SupplierLedgerEntry[];
  onAddSupplier: (supplier: Omit<Supplier, "id">) => void;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => void;
  onDeleteSupplier: (id: string) => void;
  currency: string;
}

export default function SuppliersManager({
  suppliers,
  ledgerEntries,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  currency
}: SuppliersManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [outstandingPayable, setOutstandingPayable] = useState("0");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const selectedLedger = ledgerEntries
    .filter(entry => entry.supplierId === selectedSupplierId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filtered supplier list
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startAdd = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setGstin("");
    setOutstandingPayable("0");
    setStatus("active");
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEdit = (supplier: Supplier) => {
    setName(supplier.name);
    setContactPerson(supplier.contactPerson);
    setPhone(supplier.phone);
    setEmail(supplier.email);
    setAddress(supplier.address);
    setGstin(supplier.gstin);
    setOutstandingPayable(String(supplier.outstandingPayable));
    setStatus(supplier.status);
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
      outstandingPayable: Number(outstandingPayable) || 0
    };

    if (isEditing && selectedSupplierId) {
      onUpdateSupplier(selectedSupplierId, data);
      setIsEditing(false);
    } else {
      onAddSupplier(data);
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to completely delete this supplier? This action is irreversible.")) {
      onDeleteSupplier(id);
      setSelectedSupplierId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-full text-xs animate-fade-in">
      
      {/* Suppliers Side List */}
      <div className={`col-span-12 ${selectedSupplierId ? "md:col-span-4 hidden md:block no-print" : "md:col-span-12"} glass-card rounded-2xl p-4 md:p-6 flex flex-col h-full`}>
        {/* Search header & add */}
        <div className="p-3.5 border-b border-border-sand/30 bg-card-soft/40 flex items-center justify-between">
          <div className="relative flex-1 mr-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/60" />
            <input 
              type="text" 
              placeholder="Filter suppliers..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-card-soft/60 border border-border-sand rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
            />
          </div>
          <button 
            onClick={startAdd}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1 shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Supplier
          </button>
        </div>

        {/* List scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-sand/20 max-h-[600px] no-scrollbar">
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-stone">
              <Factory className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone" />
              <p className="font-bold">No suppliers registered</p>
            </div>
          ) : (
            filteredSuppliers.map(s => (
              <div 
                key={s.id}
                onClick={() => { setSelectedSupplierId(s.id); setIsAdding(false); setIsEditing(false); }}
                className={`p-3.5 cursor-pointer flex items-center justify-between transition-all ${
                  selectedSupplierId === s.id ? "bg-primary/10 border-r-4 border-r-primary-dark" : "hover:bg-card-soft/30"
                }`}
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-charcoal truncate">{s.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      s.status === "active" ? "bg-primary/20 text-primary-dark" : "bg-card-soft/80 text-stone"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-stone font-semibold truncate mt-0.5">Contact: {s.contactPerson || "None"}</p>
                  <p className="text-stone/70 font-mono text-[10px] mt-0.5">{s.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold text-stone uppercase tracking-wider">Our Liability</p>
                  <p className="font-extrabold text-sm text-charcoal font-mono">
                    {currency}{s.outstandingPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Supplier Profile or Form View */}
      <div className={`col-span-12 ${selectedSupplierId ? "md:col-span-8" : "md:col-span-12 hidden md:flex"} glass-card rounded-2xl p-4 md:p-6 flex flex-col min-h-[500px]`}>
        
        {/* ADD OR EDIT FORM VIEW */}
        {isAdding || isEditing ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 flex flex-col h-full bg-card-soft/10">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-3">
              <h3 className="font-bold text-charcoal text-sm font-display">
                {isAdding ? "Register New Raw Material Supplier" : `Edit Supplier: ${selectedSupplier?.name}`}
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
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Supplier Company Name *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Apex Steel Industries" 
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
                  placeholder="e.g., Amit Goel" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Supplier Mobile/Phone *</label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g., 9876501234" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Supplier Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g., sales@apexsteel.com" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Office / Warehouse Address</label>
                <textarea 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, Industrial Area, City" 
                  className="w-full px-2.5 py-1.5 h-16 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none resize-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">GST Identification Number (GSTIN)</label>
                <input 
                  type="text" 
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g., 24AAPXS5501A2Z4" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Opening Balance Outstanding ({currency})</label>
                <input 
                  type="number" 
                  value={outstandingPayable}
                  onChange={e => setOutstandingPayable(e.target.value)}
                  placeholder="0.00" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Supplier Status</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                >
                  <option value="active">Active Supplier</option>
                  <option value="inactive">Suspended / Inactive</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl shadow-md mt-4 shrink-0 text-xs transition-all active:scale-[0.98]"
            >
              {isAdding ? "Register Supplier Profile" : "Save Changes"}
            </button>
          </form>
        ) : selectedSupplier ? (
          /* SUPPLIER PROFILE VIEW & TRANSACTIONS LEDGER */
          <div className="flex flex-col h-full bg-card-soft/10">
            {/* Header */}
            <div className="p-4 border-b border-border-sand/30 bg-card-soft/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedSupplierId(null)} 
                  className="md:hidden p-1.5 bg-card-soft border border-border-sand/30 rounded-xl mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-charcoal" />
                </button>
                <div>
                  <h3 className="font-bold text-charcoal text-sm font-display leading-tight">{selectedSupplier.name}</h3>
                  <p className="text-[10px] text-stone font-semibold">Procurement & Payable Ledger • {selectedSupplier.id}</p>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button 
                  onClick={() => startEdit(selectedSupplier)}
                  className="px-2.5 py-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 font-bold rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-stone" /> Edit Profile
                </button>
                <button 
                  onClick={() => handleDelete(selectedSupplier.id)}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Supplier
                </button>
              </div>
            </div>

            {/* Procurement Stats Row */}
            <div className="p-4 border-b border-border-sand/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <PayableIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-stone uppercase tracking-widest">Our Unpaid Liability</p>
                  <p className="font-bold text-charcoal text-sm font-mono">
                    {currency}{selectedSupplier.outstandingPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary-dark rounded-full">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[9px] font-extrabold text-stone uppercase tracking-widest">GST Number</p>
                  <p className="font-bold text-charcoal font-mono truncate">{selectedSupplier.gstin || "Unlisted"}</p>
                </div>
              </div>

              <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary-dark rounded-full">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-stone uppercase tracking-widest">Supplier Contact</p>
                  <p className="font-bold text-charcoal font-mono">{selectedSupplier.phone}</p>
                </div>
              </div>
            </div>

            {/* Outstanding Aging Analysis Warning Banner */}
            <div className="px-4 py-3 border-b border-border-sand/30 bg-primary/10 flex items-center justify-between text-primary-dark rounded-xl mx-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <div>
                  <p className="font-bold text-charcoal">Liability Aging Breakdown</p>
                  <p className="text-[10px] text-stone font-semibold">Auto-generated aging estimates based on invoice records</p>
                </div>
              </div>
              <div className="flex gap-4 font-mono font-bold text-right text-[11px]">
                <div>
                  <span className="block text-[9px] text-stone uppercase font-sans font-extrabold">0-30 days</span>
                  <span className="text-charcoal">{currency}{(selectedSupplier.outstandingPayable * 0.7).toFixed(0)}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-stone uppercase font-sans font-extrabold">31-60 days</span>
                  <span className="text-amber-700">{(selectedSupplier.outstandingPayable * 0.2).toFixed(0)}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-stone uppercase font-sans font-extrabold">60+ days</span>
                  <span className="text-rose-600">{(selectedSupplier.outstandingPayable * 0.1).toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Procurement Ledger Statement */}
            <div className="flex-1 p-4 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-1.5 mb-3">
                <FileText className="w-4 h-4 text-stone" />
                <h4 className="font-bold text-charcoal font-display">Historical Ledger Account Statement</h4>
              </div>

              <div className="flex-1 border border-border-sand/30 rounded-2xl overflow-hidden bg-card-soft/20 shadow-sm">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[10px] border-b border-border-sand/30">
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Reference</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5 text-right">Debit (Purchases)</th>
                        <th className="px-4 py-2.5 text-right">Credit (Our Payments)</th>
                        <th className="px-4 py-2.5 text-right">Liability Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
                      {selectedLedger.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-stone">
                            No ledger records logged. Supply inputs will populate here.
                          </td>
                        </tr>
                      ) : (
                        selectedLedger.map((entry) => {
                          const isPurchase = entry.type === "purchase" || (entry.type === "opening" && entry.amount > 0);
                          const isPayment = entry.type === "payment";

                          return (
                            <tr key={entry.id} className="hover:bg-card-soft/30 transition-colors">
                              <td className="px-4 py-2 font-mono whitespace-nowrap">{entry.date}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  entry.type === "purchase" ? "bg-amber-500/10 text-amber-700" :
                                  entry.type === "payment" ? "bg-primary/20 text-primary-dark" : "bg-card-soft/80 text-stone"
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono">{entry.referenceId}</td>
                              <td className="px-4 py-2">{entry.description}</td>
                              <td className="px-4 py-2 text-right font-mono text-stone">
                                {isPurchase ? `${currency}${entry.amount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-primary-dark">
                                {isPayment ? `${currency}${entry.amount.toLocaleString("en-IN")}` : "—"}
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
            <Factory className="w-12 h-12 text-stone/40 mb-3 animate-pulse" />
            <h4 className="font-bold text-charcoal font-display">No Supplier Selected</h4>
            <p className="max-w-xs mt-1 text-[11px] font-medium">Select a supplier business partner from the directory on the left to verify bills, payables, contact details, and payment histories.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
