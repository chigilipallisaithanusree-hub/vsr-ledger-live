import React, { useState } from "react";
import { Invoice, Buyer, Supplier, Material } from "../types";
import { 
  BarChart, Download, FileSpreadsheet, FileText, TrendingUp, DollarSign,
  Briefcase, Activity, Calendar, Tag, ShieldCheck, PieChart
} from "lucide-react";

interface ReportsManagerProps {
  invoices: Invoice[];
  buyers: Buyer[];
  suppliers: Supplier[];
  materials: Material[];
  currency: string;
}

export default function ReportsManager({
  invoices,
  buyers,
  suppliers,
  materials,
  currency
}: ReportsManagerProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "buyers" | "suppliers" | "gst" | "profit" | "materials">("sales");
  const [profitSubTab, setProfitSubTab] = useState<"invoice" | "buyer" | "supplier" | "material" | "period" | "top-least">("invoice");

  // Summary computations
  const grossSalesTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const taxableSalesTotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const gstCollectedTotal = invoices.reduce((sum, inv) => sum + inv.taxAmount, 0);
  const outstandingReceivables = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const outstandingPayables = suppliers.reduce((sum, sup) => sum + sup.outstandingPayable, 0);

  // Profit calculation (COGS based)
  const calculateCOGS = () => {
    let cogs = 0;
    invoices.forEach(inv => {
      inv.items.forEach(it => {
        const mat = materials.find(m => m.id === it.materialId);
        if (mat) {
          cogs += it.quantity * mat.defaultPurchaseRate;
        } else {
          cogs += it.quantity * (it.rate * 0.7); // default 30% margin fallback
        }
      });
    });
    return Math.round(cogs);
  };

  const totalCOGS = calculateCOGS();
  const netProfit = Math.max(0, taxableSalesTotal - totalCOGS);
  const profitMarginPercent = taxableSalesTotal > 0 ? Math.round((netProfit / taxableSalesTotal) * 100) : 0;

  // --- CSV Export Helper ---
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Export Sales
  const exportSalesCSV = () => {
    const headers = ["Invoice No", "Buyer", "Date", "Taxable Amt", "GST Tax", "Gross Total", "Status"];
    const rows = invoices.map(inv => {
      const b = buyers.find(buyer => buyer.id === inv.buyerId);
      return [
        inv.invoiceNumber,
        `"${b ? b.name : 'Unknown'}"`,
        inv.date,
        String(inv.subtotal),
        String(inv.taxAmount),
        String(inv.total),
        inv.status
      ];
    });
    downloadCSV("VSR_Sales_Report.csv", headers, rows);
  };

  // 2. Export Buyers
  const exportBuyersCSV = () => {
    const headers = ["ID", "Buyer Name", "Contact Person", "Phone", "Email", "GSTIN", "Outstanding Balance", "Status"];
    const rows = buyers.map(b => [
      b.id,
      `"${b.name}"`,
      `"${b.contactPerson}"`,
      b.phone,
      b.email,
      b.gstin,
      String(b.balance),
      b.status
    ]);
    downloadCSV("VSR_Buyers_Receivable_Report.csv", headers, rows);
  };

  // 3. Export Suppliers
  const exportSuppliersCSV = () => {
    const headers = ["ID", "Supplier Name", "Contact Person", "Phone", "Email", "GSTIN", "Our Outstanding Liability", "Status"];
    const rows = suppliers.map(s => [
      s.id,
      `"${s.name}"`,
      `"${s.contactPerson}"`,
      s.phone,
      s.email,
      s.gstin,
      String(s.outstandingPayable),
      s.status
    ]);
    downloadCSV("VSR_Suppliers_Payable_Report.csv", headers, rows);
  };

  // 4. Export GST
  const exportGSTCSV = () => {
    const headers = ["Invoice No", "Date", "GSTIN", "Taxable Value", "CGST split", "SGST split", "Total GST Collected"];
    const rows = invoices.map(inv => {
      const b = buyers.find(buyer => buyer.id === inv.buyerId);
      return [
        inv.invoiceNumber,
        inv.date,
        b ? b.gstin : "",
        String(inv.subtotal),
        String(Math.round(inv.taxAmount / 2)),
        String(Math.round(inv.taxAmount / 2)),
        String(inv.taxAmount)
      ];
    });
    downloadCSV("VSR_GST_Liabilities_Report.csv", headers, rows);
  };

  // 5. Export Profit
  const exportProfitCSV = () => {
    const headers = ["Total Invoiced Revenue", "Total Cost of Goods Sold (COGS)", "Net Profit Margin Value", "Net Profit Margin (%)"];
    const rows = [[
      String(taxableSalesTotal),
      String(totalCOGS),
      String(netProfit),
      `${profitMarginPercent}%`
    ]];
    downloadCSV("VSR_Business_Profit_Report.csv", headers, rows);
  };

  // 6. Export Materials
  const exportMaterialsCSV = () => {
    const headers = ["SKU Code", "Material Name", "Category", "Unit", "Purchase Price", "Sales Price", "Current Qty On Hand", "Min Level Limit"];
    const rows = materials.map(m => [
      m.sku,
      `"${m.name}"`,
      m.category,
      m.unit,
      String(m.defaultPurchaseRate),
      String(m.defaultSalesRate),
      String(m.currentStock),
      String(m.minStockLevel)
    ]);
    downloadCSV("VSR_Materials_Inventory_Report.csv", headers, rows);
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
    const reportElement = document.querySelector(".p-4.overflow-x-auto.max-h-\\[400px\\]") || document.querySelector("table");
    if (reportElement) {
      // Filter out any buttons or sidebar items that should not print
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = reportElement.innerHTML;
      tempDiv.querySelectorAll(".no-print").forEach(el => el.remove());

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>VSR Ledger Report - ${activeTab.toUpperCase()}</title>
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
            <h1 class="text-xl font-bold mb-2 uppercase tracking-wider">VSR LEDGER - ${activeTab.toUpperCase()} REPORT</h1>
            <p class="text-xs text-gray-500 mb-4">Date Generated: ${new Date().toLocaleDateString()}</p>
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
      a.download = `VSR_${activeTab}_report.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6 text-xs font-sans animate-fade-in">
      
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-stone font-extrabold uppercase tracking-wider text-[10px]">Taxable Turnover</p>
          <p className="text-xl font-extrabold text-charcoal mt-1 font-mono">{currency}{taxableSalesTotal.toLocaleString()}</p>
          <p className="text-stone/70 text-[10px] mt-0.5 font-bold">Excluding GST values</p>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between">
          <p className="text-stone font-extrabold uppercase tracking-wider text-[10px]">GST Tax Collected</p>
          <p className="text-xl font-extrabold text-charcoal mt-1 font-mono">{currency}{gstCollectedTotal.toLocaleString()}</p>
          <p className="text-primary-dark text-[10px] mt-0.5 font-extrabold">Total CGST + SGST liability</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-primary flex flex-col justify-between">
          <p className="text-stone font-extrabold uppercase tracking-wider text-[10px]">Clear Net Profit</p>
          <p className="text-xl font-extrabold text-charcoal mt-1 font-mono">{currency}{netProfit.toLocaleString()}</p>
          <p className="text-primary-dark text-[10px] mt-0.5 font-extrabold">Margin: {profitMarginPercent}% of sales</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-rose-500 flex flex-col justify-between">
          <p className="text-stone font-extrabold uppercase tracking-wider text-[10px]">Net Receivables</p>
          <p className="text-xl font-extrabold text-charcoal mt-1 font-mono">{currency}{outstandingReceivables.toLocaleString()}</p>
          <p className="text-rose-500 text-[10px] mt-0.5 font-extrabold">Uncollected outstanding</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-card-soft/40 border-b border-border-sand/30 flex flex-wrap justify-between items-center gap-2 no-print">
          <div className="flex gap-1 overflow-x-auto scrollbar-none no-scrollbar">
            {(["sales", "buyers", "suppliers", "gst", "profit", "materials"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl font-extrabold uppercase tracking-wider text-[10px] transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-primary text-card-soft" 
                    : "bg-card-soft/60 text-stone hover:bg-card-soft border border-border-sand/30"
                }`}
              >
                {tab} Summary
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <button 
              onClick={() => {
                if (activeTab === "sales") exportSalesCSV();
                else if (activeTab === "buyers") exportBuyersCSV();
                else if (activeTab === "suppliers") exportSuppliersCSV();
                else if (activeTab === "gst") exportGSTCSV();
                else if (activeTab === "profit") exportProfitCSV();
                else if (activeTab === "materials") exportMaterialsCSV();
              }}
              className="px-2.5 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1 text-[10px] transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button 
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-card-soft hover:bg-card-soft/80 border border-border-sand/30 font-bold text-stone rounded-xl flex items-center gap-1 text-[10px] transition-all active:scale-[0.98]"
            >
              <FileText className="w-3.5 h-3.5" /> PDF / Print
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 overflow-x-auto max-h-[400px] no-scrollbar">
          
          {/* SALES TAB */}
          {activeTab === "sales" && (
            <table className="w-full text-left font-bold text-stone">
              <thead>
                <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                  <th className="px-4 py-2.5">Invoice No</th>
                  <th className="px-4 py-2.5">Buyer</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Taxable Subtotal</th>
                  <th className="px-4 py-2.5 text-right">GST Collected</th>
                  <th className="px-4 py-2.5 text-right">Invoice Total</th>
                  <th className="px-4 py-2.5 text-right">Paid Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-sand/20 text-stone font-bold">
                {invoices.map(inv => {
                  const b = buyers.find(buyer => buyer.id === inv.buyerId);
                  return (
                    <tr key={inv.id} className="hover:bg-card-soft/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-charcoal font-extrabold">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-charcoal">{b ? b.name : "Unknown"}</td>
                      <td className="px-4 py-3 font-mono">{inv.date}</td>
                      <td className="px-4 py-3 text-right font-mono text-charcoal">{currency}{inv.subtotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-stone">+{currency}{inv.taxAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-charcoal">{currency}{inv.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right uppercase">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${
                          inv.status === "paid" ? "bg-primary/20 text-primary-dark" : "bg-rose-500/10 text-rose-600"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* BUYERS TAB */}
          {activeTab === "buyers" && (
            <table className="w-full text-left font-bold text-stone">
              <thead>
                <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                  <th className="px-4 py-2.5">Company Name</th>
                  <th className="px-4 py-2.5">Contact Representative</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">GSTIN ID</th>
                  <th className="px-4 py-2.5 text-right">Ledger Balance</th>
                  <th className="px-4 py-2.5 text-right">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
                {buyers.map(b => (
                  <tr key={b.id} className="hover:bg-card-soft/30 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-charcoal">{b.name}</td>
                    <td className="px-4 py-3 text-charcoal">{b.contactPerson}</td>
                    <td className="px-4 py-3 font-mono text-stone">{b.phone}</td>
                    <td className="px-4 py-3 font-mono">{b.gstin || "Unlisted"}</td>
                    <td className={`px-4 py-3 text-right font-mono font-extrabold ${b.balance > 0 ? "text-rose-600" : "text-primary-dark"}`}>
                      {currency}{b.balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right uppercase">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${
                        b.status === "active" ? "bg-primary/20 text-primary-dark" : "bg-card-soft text-stone"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* SUPPLIERS TAB */}
          {activeTab === "suppliers" && (
            <table className="w-full text-left font-bold text-stone">
              <thead>
                <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                  <th className="px-4 py-2.5">Supplier Company</th>
                  <th className="px-4 py-2.5">Contact Person</th>
                  <th className="px-4 py-2.5">Mobile No</th>
                  <th className="px-4 py-2.5">GSTIN ID</th>
                  <th className="px-4 py-2.5 text-right">Our Liability Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-card-soft/30 transition-colors">
                    <td className="px-4 py-3 font-extrabold text-charcoal">{s.name}</td>
                    <td className="px-4 py-3 text-charcoal">{s.contactPerson}</td>
                    <td className="px-4 py-3 font-mono text-stone">{s.phone}</td>
                    <td className="px-4 py-3 font-mono">{s.gstin || "N/A"}</td>
                    <td className="px-4 py-3 text-right font-mono font-extrabold text-charcoal">
                      {currency}{s.outstandingPayable.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* GST REPORT TAB */}
          {activeTab === "gst" && (
            <div>
              <div className="bg-primary/5 p-3 rounded-2xl border border-border-sand/20 text-charcoal mb-4 font-bold">
                This report displays the itemized GST tax ledger computed across generated invoices. Use this for filing periodic CGST/SGST ledger statements.
              </div>
              <table className="w-full text-left font-bold text-stone">
                <thead>
                  <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                    <th className="px-4 py-2.5">Voucher #</th>
                    <th className="px-4 py-2.5">Invoice Date</th>
                    <th className="px-4 py-2.5">Buyer Tax ID (GSTIN)</th>
                    <th className="px-4 py-2.5 text-right">Taxable Value</th>
                    <th className="px-4 py-2.5 text-right">CGST split</th>
                    <th className="px-4 py-2.5 text-right">SGST split</th>
                    <th className="px-4 py-2.5 text-right">Total GST liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-sand/20 font-bold text-stone font-mono">
                  {invoices.map(inv => {
                    const b = buyers.find(buyer => buyer.id === inv.buyerId);
                    return (
                      <tr key={inv.id} className="hover:bg-card-soft/30 transition-colors">
                        <td className="px-4 py-3 font-sans font-extrabold text-charcoal">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-charcoal">{inv.date}</td>
                        <td className="px-4 py-3 text-stone">{b?.gstin || "Unlisted"}</td>
                        <td className="px-4 py-3 text-right text-charcoal">{currency}{inv.subtotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-stone">+{currency}{(inv.taxAmount / 2).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-stone">+{currency}{(inv.taxAmount / 2).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-primary-dark">{currency}{inv.taxAmount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PROFIT REPORT TAB */}
          {activeTab === "profit" && (
            <div className="space-y-4">
              <div className="bg-primary/5 p-3.5 rounded-2xl border border-border-sand/25 flex items-center gap-3">
                <div className="p-2 bg-card-soft rounded-full text-primary shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-charcoal text-xs">Gross COGS Margin Statement</p>
                  <p className="text-[10px] text-stone font-bold leading-normal">Profit Margins are computed dynamically using actual material acquisition cost (COGS) mapped inside our supplier logs.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-bold text-center">
                <div className="p-3 bg-card-soft/30 border border-border-sand/20 rounded-2xl">
                  <p className="text-stone text-[10px] uppercase font-extrabold">Taxable Sales Revenue</p>
                  <p className="text-lg text-charcoal font-mono font-extrabold mt-1">{currency}{taxableSalesTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-card-soft/30 border border-border-sand/20 rounded-2xl">
                  <p className="text-stone text-[10px] uppercase font-extrabold">Cost of Goods (COGS)</p>
                  <p className="text-lg text-charcoal font-mono font-extrabold mt-1">{currency}{totalCOGS.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary-dark">
                  <p className="text-primary-dark text-[10px] uppercase font-extrabold">Net Operational Profit</p>
                  <p className="text-lg font-mono font-extrabold mt-1">{currency}{netProfit.toLocaleString()}</p>
                </div>
              </div>

              {/* Subtabs Menu */}
              <div className="flex gap-1 border-b border-border-sand/20 pb-2 overflow-x-auto no-scrollbar">
                {([
                  { id: "invoice", label: "Profit by Invoice" },
                  { id: "buyer", label: "Profit by Buyer" },
                  { id: "supplier", label: "Profit by Supplier" },
                  { id: "material", label: "Profit by Material" },
                  { id: "period", label: "Monthly / Yearly" },
                  { id: "top-least", label: "Top / Least Profitable" }
                ] as const).map(sub => (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => setProfitSubTab(sub.id)}
                    className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-colors whitespace-nowrap ${
                      profitSubTab === sub.id
                        ? "bg-primary text-card-soft"
                        : "bg-card-soft/50 text-stone hover:bg-card-soft border border-border-sand/30"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Profit by Invoice Subtab */}
              {profitSubTab === "invoice" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-bold text-stone">
                    <thead>
                      <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[8px] border-b border-border-sand/30">
                        <th className="px-4 py-2">Invoice No</th>
                        <th className="px-4 py-2">Buyer</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Selling Amt</th>
                        <th className="px-4 py-2 text-right">Purchase Amt</th>
                        <th className="px-4 py-2 text-right">Transport</th>
                        <th className="px-4 py-2 text-right">Net Profit</th>
                        <th className="px-4 py-2 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-sand/20 font-mono text-[10px]">
                      {invoices.map(inv => {
                        const b = buyers.find(buyer => buyer.id === inv.buyerId);
                        const sell = inv.items.reduce((sum, it) => sum + (it.quantity * (it.selling_rate || it.rate || 0)), 0);
                        const buy = inv.items.reduce((sum, it) => sum + (it.quantity * (it.purchase_rate || 0)), 0);
                        const trans = inv.items.reduce((sum, it) => sum + (it.transportation_amount || 0), 0);
                        const profit = sell - buy - trans;
                        const margin = sell > 0 ? (profit / sell) * 100 : 0;
                        return (
                          <tr key={inv.id} className="hover:bg-card-soft/30 transition-colors">
                            <td className="px-4 py-2.5 font-sans font-extrabold text-charcoal">{inv.invoiceNumber}</td>
                            <td className="px-4 py-2.5 font-sans text-charcoal">{b?.name || "Unknown"}</td>
                            <td className="px-4 py-2.5 font-sans text-stone">{inv.date}</td>
                            <td className="px-4 py-2.5 text-right text-charcoal">{currency}{sell.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-stone">{currency}{buy.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-stone">{currency}{trans.toLocaleString()}</td>
                            <td className={`px-4 py-2.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {currency}{profit.toLocaleString()}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {margin.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Profit by Buyer Subtab */}
              {profitSubTab === "buyer" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-bold text-stone">
                    <thead>
                      <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[8px] border-b border-border-sand/30">
                        <th className="px-4 py-2">Buyer Name</th>
                        <th className="px-4 py-2 text-center">Invoices</th>
                        <th className="px-4 py-2 text-right">Total Selling</th>
                        <th className="px-4 py-2 text-right">Total Purchase</th>
                        <th className="px-4 py-2 text-right">Total Transport</th>
                        <th className="px-4 py-2 text-right">Net Profit</th>
                        <th className="px-4 py-2 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-sand/20 font-mono text-[10px]">
                      {buyers.map(b => {
                        const bInvs = invoices.filter(inv => inv.buyerId === b.id);
                        let sell = 0, buy = 0, trans = 0;
                        bInvs.forEach(inv => {
                          inv.items.forEach(it => {
                            sell += it.quantity * (it.selling_rate || it.rate || 0);
                            buy += it.quantity * (it.purchase_rate || 0);
                            trans += it.transportation_amount || 0;
                          });
                        });
                        const profit = sell - buy - trans;
                        const margin = sell > 0 ? (profit / sell) * 100 : 0;
                        if (bInvs.length === 0) return null;
                        return (
                          <tr key={b.id} className="hover:bg-card-soft/30 transition-colors">
                            <td className="px-4 py-2.5 font-sans font-extrabold text-charcoal">{b.name}</td>
                            <td className="px-4 py-2.5 text-center font-sans text-stone">{bInvs.length}</td>
                            <td className="px-4 py-2.5 text-right text-charcoal">{currency}{sell.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-stone">{currency}{buy.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-stone">{currency}{trans.toLocaleString()}</td>
                            <td className={`px-4 py-2.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {currency}{profit.toLocaleString()}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {margin.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Profit by Supplier Subtab */}
              {profitSubTab === "supplier" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-bold text-stone">
                    <thead>
                      <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[8px] border-b border-border-sand/30">
                        <th className="px-4 py-2">Supplier Name</th>
                        <th className="px-4 py-2 text-center">Transport Deliveries</th>
                        <th className="px-4 py-2 text-right">Total Transportation Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-sand/20 font-mono text-[10px]">
                      {suppliers.map(s => {
                        let count = 0;
                        let totalTrans = 0;
                        invoices.forEach(inv => {
                          inv.items.forEach(it => {
                            if (it.transport_supplier_id === s.id) {
                              count++;
                              totalTrans += it.transportation_amount || 0;
                            }
                          });
                        });
                        if (count === 0) return null;
                        return (
                          <tr key={s.id} className="hover:bg-card-soft/30 transition-colors">
                            <td className="px-4 py-2.5 font-sans font-extrabold text-charcoal">{s.name}</td>
                            <td className="px-4 py-2.5 text-center font-sans text-stone">{count}</td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-primary-dark">{currency}{totalTrans.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Profit by Material Subtab */}
              {profitSubTab === "material" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-bold text-stone">
                    <thead>
                      <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[8px] border-b border-border-sand/30">
                        <th className="px-4 py-2">Material Specification</th>
                        <th className="px-4 py-2 text-right">Qty Sold</th>
                        <th className="px-4 py-2 text-right">Total Selling</th>
                        <th className="px-4 py-2 text-right">Total Purchase</th>
                        <th className="px-4 py-2 text-right">Total Transport</th>
                        <th className="px-4 py-2 text-right">Net Profit</th>
                        <th className="px-4 py-2 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-sand/20 font-mono text-[10px]">
                      {materials.map(m => {
                        let qty = 0, sell = 0, buy = 0, trans = 0;
                        invoices.forEach(inv => {
                          inv.items.forEach(it => {
                            if (it.materialId === m.id) {
                              qty += it.quantity;
                              sell += it.quantity * (it.selling_rate || it.rate || 0);
                              buy += it.quantity * (it.purchase_rate || 0);
                              trans += it.transportation_amount || 0;
                            }
                          });
                        });
                        const profit = sell - buy - trans;
                        const margin = sell > 0 ? (profit / sell) * 100 : 0;
                        if (qty === 0) return null;
                        return (
                          <tr key={m.id} className="hover:bg-card-soft/30 transition-colors">
                            <td className="px-4 py-2.5 font-sans font-extrabold text-charcoal">{m.name}</td>
                            <td className="px-4 py-2.5 text-right text-stone font-sans">{qty} {m.unit}</td>
                            <td className="px-4 py-2.5 text-right text-charcoal">{currency}{sell.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-stone">{currency}{buy.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-stone">{currency}{trans.toLocaleString()}</td>
                            <td className={`px-4 py-2.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {currency}{profit.toLocaleString()}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {margin.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Profit by Period Subtab */}
              {profitSubTab === "period" && (() => {
                const monthlyMap: Record<string, { count: number, sell: number, buy: number, trans: number }> = {};
                const yearlyMap: Record<string, { count: number, sell: number, buy: number, trans: number }> = {};
                
                invoices.forEach(inv => {
                  const dateObj = new Date(inv.date);
                  const year = isNaN(dateObj.getTime()) ? "Unknown" : String(dateObj.getFullYear());
                  const month = isNaN(dateObj.getTime()) ? "Unknown" : `${year}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
                  
                  let sell = 0, buy = 0, trans = 0;
                  inv.items.forEach(it => {
                    sell += it.quantity * (it.selling_rate || it.rate || 0);
                    buy += it.quantity * (it.purchase_rate || 0);
                    trans += it.transportation_amount || 0;
                  });
                  
                  if (!monthlyMap[month]) monthlyMap[month] = { count: 0, sell: 0, buy: 0, trans: 0 };
                  monthlyMap[month].count++;
                  monthlyMap[month].sell += sell;
                  monthlyMap[month].buy += buy;
                  monthlyMap[month].trans += trans;
                  
                  if (!yearlyMap[year]) yearlyMap[year] = { count: 0, sell: 0, buy: 0, trans: 0 };
                  yearlyMap[year].count++;
                  yearlyMap[year].sell += sell;
                  yearlyMap[year].buy += buy;
                  yearlyMap[year].trans += trans;
                });
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h5 className="font-extrabold text-charcoal uppercase tracking-wider text-[9px] mb-1">Monthly Profit Analysis</h5>
                      <table className="w-full text-left font-bold text-stone">
                        <thead>
                          <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[7.5px] border-b border-border-sand/30">
                            <th className="px-3 py-1.5">Month</th>
                            <th className="px-3 py-1.5 text-center">Invoices</th>
                            <th className="px-3 py-1.5 text-right">Net Profit</th>
                            <th className="px-3 py-1.5 text-right">Margin %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-sand/20 font-mono text-[10px]">
                          {Object.keys(monthlyMap).sort().reverse().map(mKey => {
                            const data = monthlyMap[mKey];
                            const profit = data.sell - data.buy - data.trans;
                            const margin = data.sell > 0 ? (profit / data.sell) * 100 : 0;
                            return (
                              <tr key={mKey} className="hover:bg-card-soft/30 transition-colors">
                                <td className="px-3 py-2 font-sans font-extrabold text-charcoal">{mKey}</td>
                                <td className="px-3 py-2 text-center font-sans text-stone">{data.count}</td>
                                <td className={`px-3 py-2 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{currency}{profit.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-stone">{margin.toFixed(1)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="font-extrabold text-charcoal uppercase tracking-wider text-[9px] mb-1">Yearly Profit Analysis</h5>
                      <table className="w-full text-left font-bold text-stone">
                        <thead>
                          <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[7.5px] border-b border-border-sand/30">
                            <th className="px-3 py-1.5">Year</th>
                            <th className="px-3 py-1.5 text-center">Invoices</th>
                            <th className="px-3 py-1.5 text-right">Net Profit</th>
                            <th className="px-3 py-1.5 text-right">Margin %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-sand/20 font-mono text-[10px]">
                          {Object.keys(yearlyMap).sort().reverse().map(yKey => {
                            const data = yearlyMap[yKey];
                            const profit = data.sell - data.buy - data.trans;
                            const margin = data.sell > 0 ? (profit / data.sell) * 100 : 0;
                            return (
                              <tr key={yKey} className="hover:bg-card-soft/30 transition-colors">
                                <td className="px-3 py-2 font-sans font-extrabold text-charcoal">{yKey}</td>
                                <td className="px-3 py-2 text-center font-sans text-stone">{data.count}</td>
                                <td className={`px-3 py-2 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{currency}{profit.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-stone">{margin.toFixed(1)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Profit by Top/Least Materials Subtab */}
              {profitSubTab === "top-least" && (() => {
                const matStats = materials.map(m => {
                  let qty = 0, sell = 0, buy = 0, trans = 0;
                  invoices.forEach(inv => {
                    inv.items.forEach(it => {
                      if (it.materialId === m.id) {
                        qty += it.quantity;
                        sell += it.quantity * (it.selling_rate || it.rate || 0);
                        buy += it.quantity * (it.purchase_rate || 0);
                        trans += it.transportation_amount || 0;
                      }
                    });
                  });
                  const profit = sell - buy - trans;
                  const margin = sell > 0 ? (profit / sell) * 100 : 0;
                  return { name: m.name, qty, profit, margin, unit: m.unit };
                }).filter(st => st.qty > 0);

                const topProfitable = [...matStats].sort((a, b) => b.profit - a.profit).slice(0, 5);
                const leastProfitable = [...matStats].sort((a, b) => a.profit - b.profit).slice(0, 5);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                      <h5 className="font-extrabold text-emerald-800 uppercase tracking-wider text-[9px] flex items-center gap-1">
                        Top Profitable Materials
                      </h5>
                      <div className="space-y-2">
                        {topProfitable.length === 0 ? (
                          <p className="text-stone text-[10px] italic">No transaction data available.</p>
                        ) : (
                          topProfitable.map((st, i) => (
                            <div key={i} className="flex justify-between items-center bg-card-soft/40 p-2.5 rounded-xl border border-border-sand/10">
                              <div>
                                <p className="font-extrabold text-charcoal text-[10px]">{st.name}</p>
                                <p className="text-[8px] text-stone font-mono">Volume: {st.qty} {st.unit}</p>
                              </div>
                              <div className="text-right font-mono text-[10px]">
                                <p className="font-extrabold text-emerald-600">+{currency}{st.profit.toLocaleString()}</p>
                                <p className="text-[8px] text-emerald-600/80 font-bold">{st.margin.toFixed(1)}% margin</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                      <h5 className="font-extrabold text-rose-800 uppercase tracking-wider text-[9px] flex items-center gap-1">
                        Least Profitable Materials
                      </h5>
                      <div className="space-y-2">
                        {leastProfitable.length === 0 ? (
                          <p className="text-stone text-[10px] italic">No transaction data available.</p>
                        ) : (
                          leastProfitable.map((st, i) => (
                            <div key={i} className="flex justify-between items-center bg-card-soft/40 p-2.5 rounded-xl border border-border-sand/10">
                              <div>
                                <p className="font-extrabold text-charcoal text-[10px]">{st.name}</p>
                                <p className="text-[8px] text-stone font-mono">Volume: {st.qty} {st.unit}</p>
                              </div>
                              <div className="text-right font-mono text-[10px]">
                                <p className={`font-extrabold ${st.profit >= 0 ? "text-stone" : "text-rose-600"}`}>
                                  {currency}{st.profit.toLocaleString()}
                                </p>
                                <p className="text-[8px] text-stone/80 font-bold">{st.margin.toFixed(1)}% margin</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* MATERIALS TAB */}
          {activeTab === "materials" && (
            <table className="w-full text-left font-bold text-stone">
              <thead>
                <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[9px] border-b border-border-sand/30">
                  <th className="px-4 py-2.5">SKU Code</th>
                  <th className="px-4 py-2.5">Material Specification</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Purchase Cost Rate</th>
                  <th className="px-4 py-2.5 text-right">Sales Charge Rate</th>
                  <th className="px-4 py-2.5 text-right">On Hand Stock</th>
                  <th className="px-4 py-2.5 text-right">Alert Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-card-soft/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-stone">{m.sku}</td>
                    <td className="px-4 py-3 font-extrabold text-charcoal">{m.name}</td>
                    <td className="px-4 py-3 uppercase text-[9px] text-stone font-semibold">{m.category}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone">{currency}{m.defaultPurchaseRate}/{m.unit}</td>
                    <td className="px-4 py-3 text-right font-mono text-primary-dark">{currency}{m.defaultSalesRate}/{m.unit}</td>
                    <td className={`px-4 py-3 text-right font-mono font-extrabold ${
                      m.currentStock <= m.minStockLevel ? "text-rose-600" : "text-primary-dark"
                    }`}>
                      {m.currentStock} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-stone/70">{m.minStockLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </div>
    </div>
  );
}
