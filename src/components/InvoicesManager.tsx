import React, { useState, useRef } from "react";
import { Invoice, Buyer, Material, InvoiceItem, Payment, Attachment, Supplier } from "../types";
import { 
  CreditCard, Search, Plus, Trash2, Edit2, Check, Printer, FileText, 
  Send, Image, Eye, DollarSign, Calendar, X, ShoppingBag, Landmark,
  Smartphone, ShieldAlert, ArrowLeftRight, Copy, HelpCircle, FileCheck
} from "lucide-react";

interface InvoicesManagerProps {
  invoices: Invoice[];
  buyers: Buyer[];
  materials: Material[];
  suppliers: Supplier[];
  onAddInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber">) => void;
  onAddPayment: (id: string, payment: { amount: number; method: string; referenceNo?: string; notes?: string }) => void;
  onAddAttachment: (id: string, attachment: Omit<Attachment, "id" | "uploadedAt">) => void;
  onDuplicateInvoice: (id: string) => void;
  onDeleteInvoice: (id: string) => void;
  currency: string;
  defaultGstRate: number;
  qrCodeUrl?: string;
  appUrl: string;
}

export default function InvoicesManager({
  invoices,
  buyers,
  materials,
  suppliers,
  onAddInvoice,
  onAddPayment,
  onAddAttachment,
  onDuplicateInvoice,
  onDeleteInvoice,
  currency,
  defaultGstRate,
  qrCodeUrl,
  appUrl
}: InvoicesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  
  // Create Form States
  const [buyerId, setBuyerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(0);
  const [notes, setNotes] = useState("");
  const [globalTransportSupplierId, setGlobalTransportSupplierId] = useState("");
  const [globalTransportAmount, setGlobalTransportAmount] = useState<number | "">("");
  const [globalTransportNotes, setGlobalTransportNotes] = useState("");

  const updateItemField = (idx: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...selectedItems];
    let val = value;
    if (field === "transportation_amount") {
      val = Math.max(0, Number(value) || 0);
    }
    updated[idx] = {
      ...updated[idx],
      [field]: val
    };
    
    // Recalculate amount, selling_rate, profit, margin_percentage
    const qty = Number(updated[idx].quantity || 0);
    const rate = Number(updated[idx].rate || 0);
    const trans = Number(updated[idx].transportation_amount || 0);
    const buy_rate = Number(updated[idx].purchase_rate || 0);
    
    updated[idx].amount = qty * rate;
    updated[idx].selling_rate = rate;
    
    const sellingAmount = qty * rate;
    const purchaseAmount = qty * buy_rate;
    const profit = sellingAmount - purchaseAmount - trans;
    const margin = sellingAmount > 0 ? (profit / sellingAmount) * 100 : 0;
    
    updated[idx].profit = profit;
    updated[idx].margin_percentage = Math.round(margin * 100) / 100;
    
    setSelectedItems(updated);
  };

  // Payment log states
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Other">("UPI");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Temporary line item state
  const [tempMaterialId, setTempMaterialId] = useState("");
  const [tempQty, setTempQty] = useState("10");
  const [tempRate, setTempRate] = useState("0");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

  // Search filter
  const filteredInvoices = invoices.filter(inv => {
    const buyer = buyers.find(b => b.id === inv.buyerId);
    return inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (buyer && buyer.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const startAdd = () => {
    setBuyerId(buyers[0]?.id || "");
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedItems([]);
    setNotes("");
    setGlobalTransportSupplierId("");
    setGlobalTransportAmount("");
    setGlobalTransportNotes("");
    setTempMaterialId("");
    setTempQty("10");
    setTempRate("0");
    setIsAdding(true);
  };

  const handleAddLineItem = () => {
    if (!tempMaterialId) return;
    const material = materials.find(m => m.id === tempMaterialId);
    if (!material) return;

    // Check duplicates
    const existingIdx = selectedItems.findIndex(it => it.materialId === tempMaterialId);
    if (existingIdx !== -1) {
      const updated = [...selectedItems];
      updated[existingIdx].quantity += Number(tempQty) || 1;
      updated[existingIdx].amount = updated[existingIdx].quantity * updated[existingIdx].rate;
      setSelectedItems(updated);
    } else {
      const rateVal = Number(tempRate) || material.defaultSalesRate;
      const qtyVal = Number(tempQty) || 1;
      const newItem: InvoiceItem = {
        materialId: tempMaterialId,
        name: material.name,
        quantity: qtyVal,
        rate: rateVal,
        amount: qtyVal * rateVal,
        transportation_amount: 0,
        transport_supplier_id: "",
        transportation_notes: "",
        purchase_rate: material.defaultPurchaseRate,
        selling_rate: rateVal
      };
      setSelectedItems([...selectedItems, newItem]);
    }

    setTempMaterialId("");
    setTempQty("10");
    setTempRate("0");
  };

  const handleRemoveLineItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerId || selectedItems.length === 0) {
      alert("Please select a buyer company and insert material items.");
      return;
    }

    const materialSubtotal = selectedItems.reduce((sum, it) => sum + it.amount, 0);
    const itemTransportTotal = selectedItems.reduce((sum, it) => sum + (it.transportation_amount || 0), 0);
    const transportTotal = itemTransportTotal + (Number(globalTransportAmount) || 0);
    const taxAmt = Math.round(materialSubtotal * (defaultGstRate / 100));
    const grossTotal = materialSubtotal + taxAmt + transportTotal;

    onAddInvoice({
      buyerId,
      date,
      items: selectedItems,
      notes,
      status: "unpaid",
      subtotal: materialSubtotal,
      taxAmount: taxAmt,
      total: grossTotal,
      balanceDue: grossTotal,
      payments: [],
      attachments: [],
      transport: (globalTransportAmount !== "" && Number(globalTransportAmount) > 0) ? {
        supplierId: globalTransportSupplierId || null,
        amount: Number(globalTransportAmount),
        notes: globalTransportNotes
      } : undefined
    });

    setIsAdding(false);
  };

  const handleMaterialSelect = (id: string) => {
    setTempMaterialId(id);
    const m = materials.find(mat => mat.id === id);
    if (m) {
      setTempRate(String(m.defaultSalesRate));
    }
  };

  const handleLogPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !payAmount) return;

    onAddPayment(selectedInvoiceId, {
      amount: Number(payAmount),
      method: payMethod,
      referenceNo: payReference || undefined,
      notes: payNotes || undefined
    });

    // Reset payment states
    setPayAmount("");
    setPayReference("");
    setPayNotes("");
    setShowPayModal(false);
  };

  const startPaymentModal = () => {
    if (!selectedInvoice) return;
    setPayAmount(String(selectedInvoice.balanceDue));
    setPayMethod("UPI");
    setPayReference("");
    setPayNotes("");
    setShowPayModal(true);
  };

  // Convert File Upload to base64
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedInvoiceId) return;

    const reader = new FileReader();
    reader.onload = () => {
      onAddAttachment(selectedInvoiceId, {
        name: file.name,
        fileType: file.type,
        size: file.size,
        base64Data: reader.result as string
      });
    };
    reader.readAsDataURL(file);
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
      const invoiceElement = document.querySelector(".print-card");
      if (invoiceElement) {
        // Create a temporary element to strip out secret "no-print" sections like Confidential Profit Analysis and edit buttons
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = invoiceElement.innerHTML;
        tempDiv.querySelectorAll(".no-print").forEach(el => el.remove());
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invoice - ${selectedInvoice?.invoiceNumber || "Draft"}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              body { font-family: sans-serif; background: white; color: #1c1917; padding: 40px; }
              .no-print { display: none !important; }
              /* VSR Charcoal and Champagne theme highlights for print */
              .text-charcoal { color: #1c1917 !important; }
              .bg-primary { background-color: #1c1917 !important; color: #f5f5f4 !important; }
              .text-primary-dark { color: #78350f !important; }
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
        a.download = `Invoice_${selectedInvoice?.invoiceNumber || "Draft"}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Printable element .print-card not found");
      }
    } catch (err) {
      console.error("PDF generation or print triggered error inside InvoicesManager: ", err);
      alert("Export/Print encountered an issue. For best results, please open the application in a new tab (using the button in the top right) and click print, or use Ctrl+P / Cmd+P directly.");
    }
  };

  const handleWhatsAppShare = () => {
    if (!selectedInvoice) return;
    const buyer = buyers.find(b => b.id === selectedInvoice.buyerId);
    if (!buyer) return;

    // Clean phone number (keep digits only)
    const phoneNo = buyer.phone.replace(/\D/g, "");
    
    // Construct pre-filled template message
    const message = `Dear ${buyer.name},

Your invoice ${selectedInvoice.invoiceNumber} dated ${selectedInvoice.date} has been generated.

Total Amount: ${currency}${selectedInvoice.total.toLocaleString("en-IN")}

Please find your detailed invoice document and make the payment using this link: ${appUrl}/invoice/${selectedInvoice.id}

Thank you for your business!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNo}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleDelete = (id: string) => {
    if (confirm("WARNING: Deleting this invoice reverses buyer balance debits and restores material items stock quantity counts. Proceed?")) {
      onDeleteInvoice(id);
      setSelectedInvoiceId(null);
    }
  };

  // Tax calculations
  const subtotal = selectedItems.reduce((sum, it) => sum + it.amount, 0);
  const taxSplit = Math.round(subtotal * ((defaultGstRate / 2) / 100)); // split equally into CGST & SGST
  const totalWithTax = subtotal + (taxSplit * 2);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start h-full text-xs animate-fade-in">
      
      {/* Invoice Left Master list */}
      <div className={`col-span-12 ${selectedInvoiceId ? "md:col-span-4 hidden md:block no-print" : "md:col-span-12"} glass-card rounded-2xl p-4 md:p-6 flex flex-col h-full`}>
        <div className="p-3.5 border-b border-border-sand/30 bg-card-soft/40 flex items-center justify-between">
          <div className="relative flex-1 mr-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/60" />
            <input 
              type="text" 
              placeholder="Search invoice number, client..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-card-soft/60 border border-border-sand rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
            />
          </div>
          <button 
            onClick={startAdd}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1 shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Invoice
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border-sand/20 max-h-[600px] no-scrollbar">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-stone">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone animate-pulse" />
              <p className="font-bold">No invoices generated</p>
            </div>
          ) : (
            filteredInvoices.map(inv => {
              const buyer = buyers.find(b => b.id === inv.buyerId);
              return (
                <div 
                  key={inv.id}
                  onClick={() => { setSelectedInvoiceId(inv.id); setIsAdding(false); }}
                  className={`p-3.5 cursor-pointer flex items-center justify-between transition-all ${
                    selectedInvoiceId === inv.id ? "bg-primary/10 border-r-4 border-r-primary-dark" : "hover:bg-card-soft/30"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-charcoal font-mono">{inv.invoiceNumber}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                        inv.status === "paid" ? "bg-primary/20 text-primary-dark" :
                        inv.status === "partial" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-charcoal font-bold truncate mt-0.5">{buyer?.name || "Unlisted Buyer"}</p>
                    <p className="text-stone font-mono text-[9px] mt-0.5">Date: {inv.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-bold text-stone uppercase tracking-wider">Gross Total</p>
                    <p className="font-extrabold text-charcoal text-sm font-mono">{currency}{inv.total.toLocaleString("en-IN")}</p>
                    {inv.balanceDue > 0 && (
                      <p className="text-[9px] font-bold text-rose-500 font-mono mt-0.5">Due: {currency}{inv.balanceDue.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invoice details right area */}
      <div className={`col-span-12 ${selectedInvoiceId ? "md:col-span-8" : "md:col-span-12 hidden md:flex"} glass-card rounded-2xl p-4 md:p-6 flex flex-col min-h-[500px]`}>
        
        {/* ADD VIEW */}
        {isAdding ? (
          <form onSubmit={handleSaveInvoice} className="p-4 flex flex-col h-full space-y-4 max-h-[650px] overflow-y-auto bg-card-soft/10 no-scrollbar">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-2">
              <h3 className="font-bold text-charcoal text-sm font-display">Generate Customer Invoice (Auto-Numbered)</h3>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-stone hover:text-charcoal bg-card-soft rounded-lg border border-border-sand/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Buyer Account *</label>
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
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Invoice Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Catalog material adding tray */}
            <div className="p-3 bg-card-soft/30 rounded-2xl border border-border-sand/20 space-y-3">
              <h4 className="font-extrabold text-charcoal text-[10px] uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Dispatch Materials Drawer
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Material Catalog Spec</label>
                  <select 
                    value={tempMaterialId}
                    onChange={e => handleMaterialSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold focus:ring-1 focus:ring-primary text-charcoal focus:outline-none"
                  >
                    <option value="">-- Select Material --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} (On Hand: {m.currentStock} {m.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Quantity</label>
                  <input 
                    type="number" 
                    value={tempQty}
                    onChange={e => setTempQty(e.target.value)}
                    placeholder="10"
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Rate ({currency})</label>
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

            {/* Dedicated Transportation Charges Section (Global Invoice-Level) */}
            <div className="p-3.5 bg-card-soft/30 rounded-2xl border border-border-sand/20 space-y-3 shadow-sm">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-border-sand/15">
                <ArrowLeftRight className="w-3.5 h-3.5 text-primary animate-pulse" />
                <h4 className="font-extrabold text-charcoal text-[10px] uppercase tracking-wider">
                  Transportation Charges (Global Invoice-Level)
                </h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Transport Supplier</label>
                  <select 
                    value={globalTransportSupplierId}
                    onChange={e => setGlobalTransportSupplierId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold focus:ring-1 focus:ring-primary text-charcoal focus:outline-none"
                  >
                    <option value="">-- None (Self Transport) --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Total Transportation Amount ({currency})</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0.00"
                    value={globalTransportAmount === "" ? "" : globalTransportAmount}
                    onChange={e => {
                      if (e.target.value === "") {
                        setGlobalTransportAmount("");
                      } else {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setGlobalTransportAmount(val);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Transportation Notes</label>
                  <input 
                    type="text" 
                    placeholder="Driver logs, truck license plate..."
                    value={globalTransportNotes}
                    onChange={e => setGlobalTransportNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-semibold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Selected items sheet list */}
            <div className="space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone">Added Dispatch Materials ({selectedItems.length})</p>
              {selectedItems.length === 0 ? (
                <div className="p-6 bg-card-soft/20 border border-border-sand/30 rounded-2xl text-center text-stone font-bold">
                  No materials added to dispatch sheet yet. Select and add materials above.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((it, idx) => {
                    const isExpanded = expandedItemIdx === idx;
                    return (
                      <div key={idx} className="bg-card-soft/30 border border-border-sand/30 rounded-2xl overflow-hidden p-3.5 space-y-3.5 transition-all hover:border-primary/40 shadow-sm">
                        {/* Top main details */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-[150px] flex-1">
                            <p className="text-[8px] uppercase text-stone font-extrabold tracking-wider">Material Specification</p>
                            <p className="font-extrabold text-charcoal text-xs mt-0.5">{it.name}</p>
                          </div>
                          
                          <div className="w-20">
                            <label className="block text-[8px] uppercase text-stone font-extrabold tracking-wider mb-0.5">Quantity</label>
                            <input 
                              type="number" 
                              min="1"
                              value={it.quantity}
                              onChange={e => updateItemField(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                              className="w-full px-2 py-1 border border-border-sand rounded-xl text-charcoal font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary bg-card-soft/40"
                            />
                          </div>

                          <div className="w-24">
                            <label className="block text-[8px] uppercase text-stone font-extrabold tracking-wider mb-0.5">Rate ({currency})</label>
                            <input 
                              type="number" 
                              min="0"
                              value={it.rate}
                              onChange={e => updateItemField(idx, "rate", Math.max(0, Number(e.target.value) || 0))}
                              className="w-full px-2 py-1 border border-border-sand rounded-xl text-charcoal font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary bg-card-soft/40"
                            />
                          </div>

                          <div className="text-right pr-2">
                            <p className="text-[8px] uppercase text-stone font-extrabold tracking-wider">Subtotal</p>
                            <p className="font-mono font-extrabold text-charcoal mt-1">{currency}{it.amount.toLocaleString()}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              type="button"
                              onClick={() => setExpandedItemIdx(isExpanded ? null : idx)}
                              className={`p-1.5 rounded-xl border border-border-sand/40 text-stone hover:text-charcoal transition-all ${isExpanded ? 'bg-primary/10 text-primary border-primary/20 font-extrabold' : 'bg-card-soft font-semibold'}`}
                              title="Transportation Charges"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl border border-rose-500/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable transportation charges section */}
                        {isExpanded && (
                          <div className="border-t border-border-sand/20 pt-3 mt-1.5 space-y-2.5 animate-slide-down bg-card-soft/20 -mx-3.5 -mb-3.5 p-3.5 border-b-2 border-b-primary/20">
                            <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-charcoal">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-primary animate-pulse" /> Transportation Cost & Supplier Details
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[8px] font-extrabold text-stone uppercase mb-0.5">Transport Supplier (Optional)</label>
                                <select 
                                  value={it.transport_supplier_id || ""}
                                  onChange={e => updateItemField(idx, "transport_supplier_id", e.target.value || null)}
                                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/50 font-bold focus:ring-1 focus:ring-primary text-charcoal focus:outline-none"
                                >
                                  <option value="">-- None (Self Transport) --</option>
                                  {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[8px] font-extrabold text-stone uppercase mb-0.5">Transportation Amount *</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={it.transportation_amount || 0}
                                  onChange={e => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    updateItemField(idx, "transportation_amount", val);
                                  }}
                                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/50 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[8px] font-extrabold text-stone uppercase mb-0.5">Transportation Notes</label>
                                <input 
                                  type="text" 
                                  value={it.transportation_notes || ""}
                                  onChange={e => updateItemField(idx, "transportation_notes", e.target.value)}
                                  placeholder="Driver logs, truck license plate..."
                                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/50 font-semibold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] bg-card-soft/50 p-2.5 rounded-xl text-stone font-bold border border-border-sand/10">
                              <span>Grand Total for {it.name} (Material + Transport):</span>
                              <span className="font-mono text-charcoal font-extrabold">{currency}{(it.amount + (it.transportation_amount || 0)).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note & calculations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-sand/30">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-1">Administrative Notes</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Payment terms, bank wire details, supply contract references..."
                  className="w-full h-24 px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none resize-none font-semibold text-charcoal"
                />
              </div>

              {/* Aggregates calculation block */}
              {(() => {
                const totalMaterialCost = selectedItems.reduce((sum, it) => sum + it.amount, 0);
                const itemTransportationCost = selectedItems.reduce((sum, it) => sum + (it.transportation_amount || 0), 0);
                const totalTransportationCost = itemTransportationCost + (Number(globalTransportAmount) || 0);
                const taxSplitVal = Math.round(totalMaterialCost * ((defaultGstRate / 2) / 100));
                const totalWithTaxAndTransport = totalMaterialCost + (taxSplitVal * 2) + totalTransportationCost;

                return (
                  <div className="bg-card-soft/30 p-3.5 rounded-2xl border border-border-sand/20 space-y-2 font-bold text-stone">
                    <div className="flex justify-between">
                      <span>Material Total (Taxable):</span>
                      <span className="font-mono text-charcoal">{currency}{totalMaterialCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transportation Cost:</span>
                      <span className="font-mono text-primary-dark">+{currency}{totalTransportationCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-stone/80 text-[10px]">
                      <span>CGST split ({(defaultGstRate/2)}%):</span>
                      <span className="font-mono text-stone font-bold">+{currency}{taxSplitVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-stone/80 text-[10px]">
                      <span>SGST split ({(defaultGstRate/2)}%):</span>
                      <span className="font-mono text-stone font-bold">+{currency}{taxSplitVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-charcoal border-t border-border-sand/30 pt-1.5">
                      <span>Invoice Grand Total:</span>
                      <span className="font-mono">{currency}{totalWithTaxAndTransport.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Verify & Log Active Invoice
            </button>
          </form>
        ) : selectedInvoice ? (
          
          /* VIEW INVOICE & OPERATIONS SHEETS */
          <div className="flex flex-col h-full relative bg-card-soft/10">
            {/* Action headers */}
            <div className="p-3 border-b border-border-sand/30 bg-card-soft/30 flex flex-wrap justify-between items-center gap-2 no-print">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setSelectedInvoiceId(null)}
                  className="md:hidden p-1.5 bg-card-soft border border-border-sand/30 rounded-xl"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-charcoal" />
                </button>
                <p className="font-extrabold text-charcoal font-mono">{selectedInvoice.invoiceNumber}</p>
                <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                  selectedInvoice.status === "paid" ? "bg-primary/20 text-primary-dark" :
                  selectedInvoice.status === "partial" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>

              {/* Utility operations bar */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 text-stone rounded-xl font-bold flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Printer className="w-3.5 h-3.5 text-stone" /> Print / PDF
                </button>

                <button 
                  onClick={handleWhatsAppShare}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-card-soft rounded-xl font-bold flex items-center gap-1 transition-all active:scale-[0.98]"
                >
                  <Smartphone className="w-3.5 h-3.5 text-card-soft" /> Send WhatsApp
                </button>

                {selectedInvoice.balanceDue > 0 && (
                  <button 
                    onClick={startPaymentModal}
                    className="px-2.5 py-1.5 bg-primary hover:bg-primary-dark text-card-soft rounded-xl font-bold flex items-center gap-1 transition-all active:scale-[0.98]"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-card-soft" /> Add Payment
                  </button>
                )}

                <button 
                  onClick={() => onDuplicateInvoice(selectedInvoice.id)}
                  className="p-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 rounded-xl text-stone transition-all active:scale-[0.98]"
                  title="Duplicate Template"
                >
                  <Copy className="w-3.5 h-3.5 text-stone" />
                </button>

                <button 
                  onClick={() => handleDelete(selectedInvoice.id)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl transition-all active:scale-[0.98]"
                  title="Purge Invoice"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Formatted printable ledger layout */}
            <div className="flex-1 p-8 bg-card-soft/20 max-h-[420px] overflow-y-auto print-card font-sans no-scrollbar">
              <div className="flex justify-between items-start border-b border-border-sand/30 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold font-display uppercase tracking-wider text-charcoal">VSR ENTERPRISES</h2>
                  <p className="text-[9px] text-stone mt-0.5 leading-normal max-w-xs font-bold">
                    Plot No. 12, Industrial Area, Sector 4, Gandhinagar, Gujarat, India - 382010
                  </p>
                  <p className="text-[9px] text-stone/70 font-mono mt-0.5">GSTIN: 24AAACV1234A1Z5 | Mob: +91 98765 43210</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 bg-primary text-card-soft font-extrabold tracking-widest text-[9px] uppercase rounded-full">
                    TAX INVOICE VOUCHER
                  </span>
                  <p className="font-mono font-extrabold text-charcoal text-sm mt-1.5">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-[9px] text-stone mt-0.5 font-semibold">Date: {selectedInvoice.date}</p>
                </div>
              </div>

              {/* Bill to Section */}
              <div className="grid grid-cols-2 gap-4 py-4 text-[10px]">
                <div className="bg-card-soft/40 p-2.5 rounded-2xl border border-border-sand/20 font-bold text-stone">
                  <p className="font-extrabold text-stone uppercase mb-0.5">BILL TO (BUYER DETAILS)</p>
                  {(() => {
                    const b = buyers.find(buyer => buyer.id === selectedInvoice.buyerId);
                    return b ? (
                      <>
                        <p className="font-extrabold text-charcoal text-xs">{b.name}</p>
                        <p className="text-stone mt-0.5 font-semibold">{b.address}</p>
                        <p className="text-stone/70 font-mono mt-1 font-bold">GSTIN: {b.gstin || "Unlisted"} | Phone: {b.phone}</p>
                      </>
                    ) : (
                      <p className="text-stone">Buyer details loading...</p>
                    );
                  })()}
                </div>

                <div className="bg-card-soft/40 p-2.5 rounded-2xl border border-border-sand/20 text-right space-y-1 font-bold text-stone">
                  <p className="font-extrabold text-stone uppercase mb-0.5">COMMERCIAL AGGREGATE SUMMARY</p>
                  <p className="text-stone">Gross Payable: <span className="font-mono font-extrabold text-charcoal">{currency}{selectedInvoice.total.toLocaleString()}</span></p>
                  <p className="text-primary-dark font-extrabold">Total Paid Clearance: <span className="font-mono">{currency}{(selectedInvoice.total - selectedInvoice.balanceDue).toLocaleString()}</span></p>
                  <p className="text-rose-600 font-extrabold text-xs border-t border-border-sand/30 pt-1">Remaining Due: <span className="font-mono">{currency}{selectedInvoice.balanceDue.toLocaleString()}</span></p>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-border-sand/30 rounded-2xl overflow-hidden bg-card-soft/10 shadow-sm mb-4 overflow-x-auto no-scrollbar">
                <table className="w-full text-left font-bold text-stone min-w-[600px] md:min-w-0">
                  <thead>
                    <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[8px] border-b border-border-sand/30">
                      <th className="px-3 py-1.5">#</th>
                      <th className="px-3 py-1.5">Material Specifications</th>
                      <th className="px-3 py-1.5 text-right">Qty</th>
                      <th className="px-3 py-1.5 text-right">Selling Rate</th>
                      <th className="px-3 py-1.5 text-right">Transport Charges</th>
                      <th className="px-3 py-1.5 text-right">Material Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-sand/20 font-bold text-stone text-[9px]">
                    {selectedInvoice.items.map((it, idx) => {
                      const transAmt = it.transportation_amount || 0;
                      const matTotal = it.amount + transAmt;
                      return (
                        <tr key={idx} className="hover:bg-card-soft/30 transition-colors">
                          <td className="px-3 py-2 font-mono text-stone">{idx + 1}</td>
                          <td className="px-3 py-2 font-extrabold text-charcoal">
                            <div>{it.name}</div>
                            {it.transportation_notes && (
                              <div className="text-[7px] font-normal text-stone/80 italic mt-0.5">Note: {it.transportation_notes}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-charcoal">{it.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono text-stone">{currency}{it.rate.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono text-stone">
                            {transAmt > 0 ? `${currency}${transAmt.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-charcoal">{currency}{matTotal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Splits tax calculation and bank info */}
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 text-[9px] text-stone space-y-2 font-bold">
                  <div className="bg-primary/5 p-2.5 rounded-2xl border border-border-sand/20 max-w-sm font-sans">
                    <p className="font-extrabold text-primary-dark uppercase mb-0.5">Remittance Bank details</p>
                    <p className="font-bold text-charcoal">Bank: State Bank of India | A/c: 300412891223</p>
                    <p className="font-bold text-charcoal">IFSC Code: SBIN0001043 | UPI ID: vsrenterprises@upi</p>
                  </div>

                  {qrCodeUrl && (
                    <div className="mt-2 flex items-center gap-3 bg-primary/5 p-2.5 rounded-2xl border border-border-sand/20 max-w-sm font-sans">
                      <img 
                        src={qrCodeUrl} 
                        alt="Payment QR Code" 
                        className="w-14 h-14 object-contain rounded-lg border border-border-sand/30 bg-white p-1"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-extrabold text-primary-dark uppercase text-[8px]">Scan to Pay via UPI</p>
                        <p className="text-stone text-[8px] mt-0.5 font-semibold leading-tight">Scan this QR code to transfer outstanding dues directly to our business bank account.</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedInvoice.notes && (
                    <div className="p-2 bg-card-soft/40 border border-border-sand/20 rounded-2xl max-w-sm">
                      <p className="font-extrabold text-stone uppercase text-[8px] mb-0.5">Notes</p>
                      <p className="text-stone whitespace-pre-wrap font-semibold leading-relaxed">{selectedInvoice.notes}</p>
                    </div>
                  )}

                  {selectedInvoice.transport && selectedInvoice.transport.amount > 0 && (
                    <div className="p-2 bg-card-soft/40 border border-border-sand/20 rounded-2xl max-w-sm mt-2">
                      <p className="font-extrabold text-stone uppercase text-[8px] mb-0.5">Transport Details</p>
                      <p className="font-bold text-charcoal">
                        Amount: {currency}{selectedInvoice.transport.amount.toLocaleString()} 
                        {(() => {
                          const s = suppliers.find(sup => sup.id === selectedInvoice.transport?.supplierId);
                          return s ? ` | Supplier: ${s.name}` : " | Self Transport";
                        })()}
                      </p>
                      {selectedInvoice.transport.notes && (
                        <p className="text-stone/80 text-[8px] italic mt-0.5">Note: {selectedInvoice.transport.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-64 space-y-1 text-[9px] text-stone font-bold">
                  <div className="flex justify-between">
                    <span>Taxable Subtotal (Material):</span>
                    <span className="font-mono text-charcoal">{currency}{selectedInvoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {(() => {
                    const transTotal = (selectedInvoice.transport?.amount || 0) + selectedInvoice.items.reduce((sum, it) => sum + (it.transportation_amount || 0), 0);
                    return transTotal > 0 ? (
                      <div className="flex justify-between text-primary-dark">
                        <span>Transportation Charges:</span>
                        <span className="font-mono text-primary-dark">+{currency}{transTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex justify-between text-stone">
                    <span>CGST split ({(defaultGstRate/2)}%):</span>
                    <span className="font-mono text-stone">+{currency}{(selectedInvoice.taxAmount / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-stone">
                    <span>SGST split ({(defaultGstRate/2)}%):</span>
                    <span className="font-mono text-stone">+{currency}{(selectedInvoice.taxAmount / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-charcoal border-t border-border-sand/30 pt-1.5">
                    <span>Gross Grand Total:</span>
                    <span className="font-mono">{currency}{selectedInvoice.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidential Profit Analysis - Visible only to admin, completely excluded from printing */}
            {(() => {
              const overallRevenue = selectedInvoice.items.reduce((sum, it) => sum + (it.quantity * (it.selling_rate || it.rate || 0)), 0);
              const overallCOGS = selectedInvoice.items.reduce((sum, it) => sum + (it.quantity * (it.purchase_rate || 0)), 0);
              const overallTransport = (selectedInvoice.transport?.amount || 0) + selectedInvoice.items.reduce((sum, it) => sum + (it.transportation_amount || 0), 0);
              const overallProfit = overallRevenue - overallCOGS - overallTransport;
              const overallMargin = overallRevenue > 0 ? (overallProfit / overallRevenue) * 100 : 0;

              return (
                <div className="mx-8 my-4 p-5 bg-[#1C1C1E] text-[#D4C9BA] rounded-2xl border border-[rgba(212,201,186,0.15)] shadow-lg no-print space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[rgba(212,201,186,0.15)]">
                    <h4 className="font-extrabold text-[10px] uppercase tracking-widest flex items-center gap-1.5 text-[#D4C9BA]">
                      <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" /> Profit Analysis
                    </h4>
                    <span className="text-[8px] font-extrabold px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-full">
                      ADMIN ONLY
                    </span>
                  </div>

                  {/* Materials breakdown */}
                  <div className="space-y-4 divide-y divide-[#D4C9BA]/20">
                    {selectedInvoice.items.map((it, idx) => {
                      const itemQty = it.quantity || 1;
                      const sell = it.selling_rate || it.rate || 0;
                      const buy = it.purchase_rate || 0;
                      const trans = it.transportation_amount || 0;
                      const sellingAmount = itemQty * sell;
                      const purchaseAmount = itemQty * buy;
                      const itemProfit = sellingAmount - purchaseAmount - trans;

                      return (
                        <div key={idx} className="space-y-2 pt-3 first:pt-0">
                          <div className="flex justify-between text-xs font-extrabold text-[#D4C9BA]">
                            <span>Material:</span>
                            <span className="font-sans text-amber-300">{it.name}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] font-semibold text-[#D4C9BA]/80">
                            <div className="bg-[#121213] p-2 rounded-xl border border-[#D4C9BA]/10">
                              <span className="block text-[#D4C9BA]/55 text-[8px] uppercase">Selling Amount</span>
                              <span className="font-mono font-bold text-white">{currency}{sellingAmount.toLocaleString()}</span>
                            </div>
                            <div className="bg-[#121213] p-2 rounded-xl border border-[#D4C9BA]/10">
                              <span className="block text-[#D4C9BA]/55 text-[8px] uppercase">Purchase Amount</span>
                              <span className="font-mono font-bold text-white">{currency}{purchaseAmount.toLocaleString()}</span>
                            </div>
                            <div className="bg-[#121213] p-2 rounded-xl border border-[#D4C9BA]/10">
                              <span className="block text-[#D4C9BA]/55 text-[8px] uppercase">Transportation</span>
                              <span className="font-mono font-bold text-white">{currency}{trans.toLocaleString()}</span>
                            </div>
                            <div className="bg-[#121213] p-2 rounded-xl border border-[#D4C9BA]/10">
                              <span className="block text-[#D4C9BA]/55 text-[8px] uppercase">Profit</span>
                              <span className={`font-mono font-bold ${itemProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {currency}{itemProfit.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Invoice profit summary */}
                  <div className="border-t border-[#D4C9BA]/20 pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-[8px] uppercase text-[#D4C9BA]/60 block font-bold">Total Profit</span>
                      <span className={`text-base font-extrabold font-mono ${overallProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {currency}{overallProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] uppercase text-[#D4C9BA]/60 block font-bold">Profit Margin</span>
                      <span className="text-base font-extrabold font-mono text-[#D4C9BA]">
                        {overallMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Invoice attachments & Payment logs tray - bottom area */}
            <div className="border-t border-border-sand/30 p-4 bg-card-soft/20 grid grid-cols-1 sm:grid-cols-2 gap-4 no-print text-[10px]">
              
              {/* Payment Records history */}
              <div className="bg-card-soft/40 p-3.5 rounded-2xl border border-border-sand/20 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-border-sand/20">
                  <h4 className="font-extrabold text-charcoal flex items-center gap-1 font-display">
                    <FileCheck className="w-3.5 h-3.5 text-primary" /> Payments Clearance Log ({selectedInvoice.payments.length})
                  </h4>
                  {selectedInvoice.balanceDue > 0 && (
                    <button 
                      onClick={startPaymentModal}
                      className="text-primary-dark hover:underline font-extrabold transition-all"
                    >
                      + ADD PAYMENT
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[100px] space-y-1.5 font-bold text-stone no-scrollbar">
                  {selectedInvoice.payments.length === 0 ? (
                    <p className="text-stone py-3 text-center">No payments received yet. Unpaid invoice.</p>
                  ) : (
                    selectedInvoice.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-start py-1.5 bg-card-soft/40 px-2 rounded-xl border border-border-sand/10">
                        <div>
                          <p className="text-charcoal font-extrabold">{p.method} {p.referenceNo ? `(Ref: ${p.referenceNo})` : ""}</p>
                          <p className="text-[8px] text-stone font-mono">{p.date} • {p.notes || "No notes"}</p>
                        </div>
                        <span className="font-extrabold text-primary-dark font-mono">+{currency}{p.amount.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Invoice specific Uploaded Documents attachment vault */}
              <div className="bg-card-soft/40 p-3.5 rounded-2xl border border-border-sand/20 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-border-sand/20">
                  <h4 className="font-extrabold text-charcoal flex items-center gap-1 font-display">
                    <Image className="w-3.5 h-3.5 text-primary" /> Attachments Vault ({selectedInvoice.attachments.length})
                  </h4>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary-dark hover:underline font-extrabold transition-all"
                  >
                    + UPLOAD FILE
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleAttachmentUpload}
                    className="hidden" 
                    accept="image/*,application/pdf"
                  />
                </div>

                <div className="flex-1 overflow-y-auto max-h-[100px] grid grid-cols-2 gap-2 no-scrollbar">
                  {selectedInvoice.attachments.length === 0 ? (
                    <p className="col-span-2 text-stone py-3 text-center">No receipts, challans, or screenshot documents attached.</p>
                  ) : (
                    selectedInvoice.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1.5 bg-card-soft/40 border border-border-sand/10 rounded-xl overflow-hidden">
                        <div className="w-8 h-8 rounded bg-card-soft/80 shrink-0 overflow-hidden flex items-center justify-center text-[8px] font-extrabold text-stone border border-border-sand/10">
                          {att.fileType.includes("image") ? (
                            <img src={att.base64Data} alt={att.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : "PDF"}
                        </div>
                        <div className="min-w-0 flex-1 font-bold">
                          <p className="font-extrabold text-charcoal truncate" title={att.name}>{att.name}</p>
                          <a 
                            href={att.base64Data} 
                            download={att.name}
                            className="text-primary hover:underline text-[8px] font-extrabold block mt-0.5"
                          >
                            DOWNLOAD
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone text-center bg-card-soft/10">
            <CreditCard className="w-12 h-12 text-stone/40 mb-3 animate-pulse" />
            <h4 className="font-bold text-charcoal font-display">No Invoice Selected</h4>
            <p className="max-w-xs mt-1 text-[11px] font-medium">Select an active ledger invoice record from the directory list, or click "+ Invoice" to generate a tax voucher.</p>
          </div>
        )}
      </div>
      </div>

      {/* PAYMENTS INPUT POPUP MODAL */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 bg-charcoal/45 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="dialog-glass rounded-2xl max-w-sm w-full p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-2">
              <h4 className="font-bold text-charcoal text-sm font-display">Log Payment Receipt</h4>
              <button onClick={() => setShowPayModal(false)} className="p-1 text-stone hover:text-charcoal bg-card-soft border border-border-sand/30 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogPaymentSubmit} className="space-y-3 text-xs font-bold text-stone">
              <div>
                <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Remaining Balance Outstanding</label>
                <p className="text-lg font-extrabold font-mono text-rose-600">{currency}{selectedInvoice.balanceDue.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Payment Amount Received *</label>
                <input 
                  type="number" 
                  required
                  max={selectedInvoice.balanceDue}
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Remittance Method</label>
                <select 
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:outline-none"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Wire Transfer (NEFT/IMPS)</option>
                  <option value="Cash">Physical Cash</option>
                  <option value="Cheque">Physical Cheque</option>
                  <option value="Other">Other Remittances</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Transaction reference (UPI No / Cheque ID)</label>
                <input 
                  type="text" 
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                  placeholder="e.g., UPI92848102"
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-stone uppercase mb-0.5">Transaction Notes</label>
                <textarea 
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g., Confirmed receipt on State Bank wire"
                  className="w-full h-12 px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none resize-none font-semibold text-charcoal"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-extrabold rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                Clear Outstanding & Log Receipt
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
