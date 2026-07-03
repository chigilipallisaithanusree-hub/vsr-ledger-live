import React, { useState } from "react";
import { Quotation, Buyer, Material, QuoteItem } from "../types";
import { 
  FileText, Search, Plus, Trash2, Edit2, Check, RefreshCw,
  Printer, ArrowLeftRight, X, AlertCircle, ShoppingCart, Info, User
} from "lucide-react";

interface QuotationsManagerProps {
  quotations: Quotation[];
  buyers: Buyer[];
  materials: Material[];
  onAddQuotation: (quotation: Omit<Quotation, "id" | "quoteNumber">) => void;
  onUpdateQuotation: (id: string, updates: Partial<Quotation>) => void;
  onConvertQuotation: (id: string) => void;
  onDeleteQuotation: (id: string) => void;
  currency: string;
  defaultGstRate: number;
}

export default function QuotationsManager({
  quotations,
  buyers,
  materials,
  onAddQuotation,
  onUpdateQuotation,
  onConvertQuotation,
  onDeleteQuotation,
  currency,
  defaultGstRate
}: QuotationsManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [buyerId, setBuyerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0]);
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Quotation["status"]>("draft");

  // Temporary line item state
  const [tempMaterialId, setTempMaterialId] = useState("");
  const [tempQty, setTempQty] = useState("10");
  const [tempRate, setTempRate] = useState("0");

  const selectedQuote = quotations.find(q => q.id === selectedQuoteId);

  // Search filter
  const filteredQuotes = quotations.filter(q => {
    const buyer = buyers.find(b => b.id === q.buyerId);
    return q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (buyer && buyer.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const startAdd = () => {
    setBuyerId(buyers[0]?.id || "");
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 10*24*60*60*1000).toISOString().split("T")[0]);
    setSelectedItems([]);
    setNotes("");
    setStatus("draft");
    setTempMaterialId("");
    setTempQty("10");
    setTempRate("0");
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEdit = (q: Quotation) => {
    setSelectedQuoteId(q.id);
    setBuyerId(q.buyerId);
    setDate(q.date);
    setDueDate(q.dueDate);
    setSelectedItems([...q.items]);
    setNotes(q.notes || "");
    setStatus(q.status);
    setTempMaterialId("");
    setTempQty("10");
    setTempRate("0");
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleAddLineItem = () => {
    if (!tempMaterialId) return;
    const material = materials.find(m => m.id === tempMaterialId);
    if (!material) return;

    // Check if item already exists
    const existingIdx = selectedItems.findIndex(it => it.materialId === tempMaterialId);
    if (existingIdx !== -1) {
      const updated = [...selectedItems];
      updated[existingIdx].quantity += Number(tempQty) || 1;
      updated[existingIdx].amount = updated[existingIdx].quantity * updated[existingIdx].rate;
      setSelectedItems(updated);
    } else {
      const newItem: QuoteItem = {
        materialId: tempMaterialId,
        name: material.name,
        quantity: Number(tempQty) || 1,
        rate: Number(tempRate) || material.defaultSalesRate,
        amount: (Number(tempQty) || 1) * (Number(tempRate) || material.defaultSalesRate)
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    // Reset temporary states
    setTempMaterialId("");
    setTempQty("1");
    setTempRate("0");
  };

  const handleRemoveLineItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId || selectedItems.length === 0) {
      alert("Please select a buyer and add at least one catalog material item.");
      return;
    }

    const sub = selectedItems.reduce((sum, it) => sum + it.amount, 0);
    const tax = Math.round(sub * (defaultGstRate / 100));
    const tot = sub + tax;

    const data = {
      buyerId,
      date,
      dueDate,
      items: selectedItems,
      notes,
      status,
      subtotal: sub,
      taxAmount: tax,
      total: tot
    };

    if (isEditing && selectedQuoteId) {
      onUpdateQuotation(selectedQuoteId, data);
      setIsEditing(false);
    } else {
      onAddQuotation(data);
      setIsAdding(false);
    }
  };

  const handleConvert = (id: string) => {
    if (confirm("Convert this quotation to an active unpaid customer invoice? This will automatically adjust on-hand stock and update client ledger balance.")) {
      onConvertQuotation(id);
      setSelectedQuoteId(id); // Keep viewing
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this quotation sheet?")) {
      onDeleteQuotation(id);
      setSelectedQuoteId(null);
    }
  };

  const handlePrint = () => {
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
    const quoteElement = document.querySelector(".print-card");
    if (quoteElement) {
      // Filter out any buttons or interactive items that should not print
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = quoteElement.innerHTML;
      tempDiv.querySelectorAll(".no-print").forEach(el => el.remove());

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation - ${selectedQuote?.quoteNumber || "Draft"}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: sans-serif; background: white; color: #1c1917; padding: 40px; }
            .no-print { display: none !important; }
            /* VSR Charcoal and Champagne theme highlights for print */
            .text-charcoal { color: #1c1917 !important; }
            .bg-primary { background-color: #1c1917 !important; color: #f5f5f4 !important; }
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
      a.download = `Quotation_${selectedQuote?.quoteNumber || "Draft"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Auto-populate rate when selecting material in creation
  const handleMaterialSelect = (id: string) => {
    setTempMaterialId(id);
    const m = materials.find(mat => mat.id === id);
    if (m) {
      setTempRate(String(m.defaultSalesRate));
    }
  };

  // Calculate totals
  const subtotal = selectedItems.reduce((sum, it) => sum + it.amount, 0);
  const taxAmount = Math.round(subtotal * (defaultGstRate / 100));
  const total = subtotal + taxAmount;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-full text-xs animate-fade-in">
      
      {/* Quotation master list - Left side */}
      <div className={`col-span-12 ${selectedQuoteId ? "md:col-span-4 hidden md:block no-print" : "md:col-span-12"} glass-card rounded-2xl p-4 md:p-6 flex flex-col h-full`}>
        <div className="p-3.5 border-b border-border-sand/30 bg-card-soft/40 flex items-center justify-between">
          <div className="relative flex-1 mr-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/60" />
            <input 
              type="text" 
              placeholder="Search quotes, clients..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-card-soft/60 border border-border-sand rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
            />
          </div>
          <button 
            onClick={startAdd}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1 shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Quote
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border-sand/20 max-h-[600px] no-scrollbar">
          {filteredQuotes.length === 0 ? (
            <div className="p-8 text-center text-stone">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone" />
              <p className="font-bold">No quotations logged</p>
            </div>
          ) : (
            filteredQuotes.map(q => {
              const buyer = buyers.find(b => b.id === q.buyerId);
              return (
                <div 
                  key={q.id}
                  onClick={() => { setSelectedQuoteId(q.id); setIsAdding(false); setIsEditing(false); }}
                  className={`p-3.5 cursor-pointer flex items-center justify-between transition-all ${
                    selectedQuoteId === q.id ? "bg-primary/10 border-r-4 border-r-primary-dark" : "hover:bg-card-soft/30"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-charcoal font-mono">{q.quoteNumber}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                        q.status === "converted" ? "bg-primary/20 text-primary-dark" :
                        q.status === "approved" ? "bg-blue-500/10 text-blue-600" :
                        q.status === "sent" ? "bg-indigo-500/10 text-indigo-600" :
                        q.status === "declined" ? "bg-rose-500/10 text-rose-600" : "bg-card-soft/80 text-stone"
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-charcoal font-bold truncate mt-0.5">{buyer?.name || "Unknown client"}</p>
                    <p className="text-stone font-mono text-[9px] mt-0.5">Date: {q.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-bold text-stone uppercase tracking-wider">Estimated Total</p>
                    <p className="font-extrabold text-charcoal text-sm font-mono">{currency}{q.total.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quotation Detail / Editor Panel - Right side */}
      <div className={`col-span-12 ${selectedQuoteId ? "md:col-span-8" : "md:col-span-12 hidden md:flex"} glass-card rounded-2xl p-4 md:p-6 flex flex-col min-h-[500px]`}>
        
        {/* CREATE OR EDIT VIEW */}
        {isAdding || isEditing ? (
          <form onSubmit={handleSaveQuotation} className="p-4 flex flex-col h-full space-y-4 max-h-[650px] overflow-y-auto bg-card-soft/10 no-scrollbar">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-2">
              <h3 className="font-bold text-charcoal text-sm font-display">
                {isAdding ? "Draft New Business Quote" : `Edit Quote: ${selectedQuote?.quoteNumber}`}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                className="p-1.5 text-stone hover:text-charcoal bg-card-soft rounded-lg border border-border-sand/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Target Buyer *</label>
                <select 
                  required
                  value={buyerId}
                  onChange={e => setBuyerId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold focus:ring-1 focus:ring-primary text-charcoal focus:outline-none"
                >
                  <option value="">-- Select Buyer --</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Quotation Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Quote Validity Till</label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Line items addition box */}
            <div className="p-3 bg-card-soft/30 rounded-2xl border border-border-sand/20 space-y-3">
              <h4 className="font-extrabold text-charcoal text-[10px] uppercase tracking-wider flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" /> Catalog Item Selection Drawer
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Material Catalog Item</label>
                  <select 
                    value={tempMaterialId}
                    onChange={e => handleMaterialSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold focus:ring-1 focus:ring-primary text-charcoal focus:outline-none"
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (In stock: {m.currentStock} {m.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Quantity</label>
                  <input 
                    type="number" 
                    value={tempQty}
                    onChange={e => setTempQty(e.target.value)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Unit Rate ({currency})</label>
                  <input 
                    type="number" 
                    value={tempRate}
                    onChange={e => setTempRate(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>

                <button 
                  type="button"
                  onClick={handleAddLineItem}
                  className="sm:col-span-2 py-1.5 px-3 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center justify-center gap-1 self-stretch sm:self-auto text-[11px] transition-all active:scale-[0.98]"
                >
                  Add Row
                </button>
              </div>
            </div>

            {/* Selected items table */}
            <div className="border border-border-sand/30 rounded-2xl overflow-hidden overflow-x-auto no-scrollbar shadow-sm bg-card-soft/20">
              <table className="w-full text-left font-bold text-stone">
                <thead>
                  <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                    <th className="px-3 py-2.5">Material / Description</th>
                    <th className="px-3 py-2.5 text-right">Quantity</th>
                    <th className="px-3 py-2.5 text-right">Unit Rate</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-stone font-bold">
                        No line items added yet. Search and add materials above.
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-card-soft/30 transition-colors">
                        <td className="px-3 py-2.5 font-extrabold text-charcoal">{it.name}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-charcoal">{it.quantity}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-stone">{currency}{it.rate}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-charcoal">{currency}{it.amount.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom section: Note & calculations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-sand/30">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-1">Administrative Notes</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Terms & conditions, delivery charges details..."
                  className="w-full h-16 px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none resize-none font-semibold text-charcoal"
                />

                <div className="mt-2">
                  <label className="block text-[10px] font-extrabold text-stone uppercase mb-1">Commercial Status</label>
                  <select 
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-border-sand bg-card-soft/40 rounded-xl font-bold text-charcoal focus:outline-none"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="sent">Sent to Customer</option>
                    <option value="approved">Customer Approved</option>
                    <option value="declined">Declined</option>
                    <option value="converted">Converted to Invoice</option>
                  </select>
                </div>
              </div>

              {/* Aggregates block */}
              <div className="bg-card-soft/30 p-3 rounded-2xl border border-border-sand/20 space-y-1.5 font-bold text-stone">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-charcoal">{currency}{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax ({defaultGstRate}%):</span>
                  <span className="font-mono text-stone">+{currency}{taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-charcoal border-t border-border-sand/30 pt-1.5">
                  <span>Gross Quotation Total:</span>
                  <span className="font-mono">{currency}{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              {isAdding ? "Save Quotation Sheet" : "Apply Changes"}
            </button>
          </form>
        ) : selectedQuote ? (
          
          /* DETAILED DOCUMENT READ-ONLY & EXPORT PRINT/CONVERT VIEW */
          <div className="flex flex-col h-full font-sans bg-card-soft/10">
            {/* Control buttons */}
            <div className="p-3 border-b border-border-sand/30 bg-card-soft/30 flex flex-wrap justify-between items-center gap-2 no-print">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setSelectedQuoteId(null)}
                  className="md:hidden p-1.5 bg-card-soft border border-border-sand/30 rounded-xl"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-charcoal" />
                </button>
                <p className="font-extrabold text-charcoal">{selectedQuote.quoteNumber}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 font-bold text-stone rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Printer className="w-3.5 h-3.5 text-stone" /> Print / PDF
                </button>

                {selectedQuote.status !== "converted" && (
                  <>
                    <button 
                      onClick={() => handleConvert(selectedQuote.id)}
                      className="px-2.5 py-1.5 bg-primary hover:bg-primary-dark font-bold text-card-soft rounded-xl flex items-center gap-1 transition-all active:scale-[0.98]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Convert to Invoice
                    </button>
                    <button 
                      onClick={() => startEdit(selectedQuote)}
                      className="p-1.5 bg-card-soft hover:bg-card-soft/85 border border-border-sand/30 rounded-xl text-stone transition-all active:scale-[0.98]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button 
                  onClick={() => handleDelete(selectedQuote.id)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Elegant Letterhead Voucher Sheet */}
            <div className="flex-1 p-8 bg-card-soft/20 max-h-[550px] overflow-y-auto print-card font-sans no-scrollbar">
              <div className="flex justify-between items-start border-b border-border-sand/30 pb-5">
                <div>
                  <h2 className="text-xl font-extrabold font-display uppercase tracking-wider text-charcoal">VSR ENTERPRISES</h2>
                  <p className="text-[10px] text-stone mt-1 max-w-xs font-bold leading-relaxed">
                    Plot No. 12, Industrial Area, Sector 4, Gandhinagar, Gujarat, India - 382010
                  </p>
                  <p className="text-[10px] text-stone/70 font-mono mt-0.5">GSTIN: 24AAACV1234A1Z5 | Mob: +91 98765 43210</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 bg-primary text-card-soft font-extrabold tracking-widest text-[9px] uppercase rounded-full">
                    QUOTATION VOUCHER
                  </span>
                  <p className="font-mono font-extrabold text-charcoal text-sm mt-2">{selectedQuote.quoteNumber}</p>
                  <p className="text-[10px] text-stone mt-0.5">Date: {selectedQuote.date}</p>
                </div>
              </div>

              {/* Buyer & supplier logs */}
              <div className="grid grid-cols-2 gap-4 py-5 text-[10px]">
                <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 font-bold text-stone">
                  <p className="font-extrabold text-stone uppercase mb-1">PROSPECTED CLIENT (BUYER)</p>
                  {(() => {
                    const b = buyers.find(buyer => buyer.id === selectedQuote.buyerId);
                    return b ? (
                      <>
                        <p className="font-extrabold text-charcoal text-xs">{b.name}</p>
                        <p className="text-stone mt-0.5 font-semibold">{b.address}</p>
                        <p className="text-stone/70 font-mono mt-1 font-bold">GSTIN: {b.gstin || "Unlisted"} | Phone: {b.phone}</p>
                      </>
                    ) : (
                      <p className="text-stone">Buyer details loaded dynamically</p>
                    );
                  })()}
                </div>

                <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 text-right font-bold text-stone">
                  <p className="font-extrabold text-stone uppercase mb-1">QUOTATION VALIDITY DETAILS</p>
                  <p className="text-stone">Valid Until: <span className="font-mono font-extrabold text-charcoal">{selectedQuote.dueDate}</span></p>
                  <p className="text-stone mt-1">Status: <span className="font-extrabold uppercase text-primary">{selectedQuote.status}</span></p>
                  {selectedQuote.convertedInvoiceId && (
                    <p className="text-primary-dark font-extrabold mt-1 font-mono text-[9px]">
                      CONVERTED TO INV #{selectedQuote.convertedInvoiceId}
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="border border-border-sand/30 rounded-2xl overflow-hidden overflow-x-auto no-scrollbar bg-card-soft/10 shadow-sm mb-4">
                <table className="w-full text-left font-bold text-stone">
                  <thead>
                    <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Item Specs / Description</th>
                      <th className="px-4 py-2.5 text-right">Quantity</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Taxable Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-sand/20 font-bold text-stone text-[10px]">
                    {selectedQuote.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-card-soft/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-extrabold text-charcoal">{it.name}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-charcoal">{it.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-stone">{currency}{it.rate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-charcoal">{currency}{it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom calculations summary */}
              <div className="mt-4 flex justify-between items-start">
                <div className="flex-1 pr-6 max-w-md">
                  {selectedQuote.notes && (
                    <div className="bg-card-soft/40 p-3 rounded-2xl border border-border-sand/20 text-stone font-bold">
                      <p className="font-extrabold text-stone text-[9px] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-stone" /> Quote Terms / Special Notes
                      </p>
                      <p className="text-[10px] text-stone whitespace-pre-wrap leading-relaxed font-semibold">
                        {selectedQuote.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="w-64 space-y-2 text-[10px] text-stone font-bold">
                  <div className="flex justify-between">
                    <span>Taxable Value (Subtotal):</span>
                    <span className="font-mono text-charcoal">{currency}{selectedQuote.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Tax Margin ({defaultGstRate}%):</span>
                    <span className="font-mono text-stone">+{currency}{selectedQuote.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-charcoal border-t border-border-sand/30 pt-2">
                    <span>Final Estimated Total:</span>
                    <span className="font-mono">{currency}{selectedQuote.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone text-center bg-card-soft/10">
            <FileText className="w-12 h-12 text-stone/40 mb-3 animate-pulse" />
            <h4 className="font-bold text-charcoal font-display">No Quotation Selected</h4>
            <p className="max-w-xs mt-1 text-[11px] font-medium">Select a commercial quotation sheet from the sidebar directory, or click "+ Quote" to draft a new customized deal proposal.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
