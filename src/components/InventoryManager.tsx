import React, { useState } from "react";
import { Material, StockAdjustment } from "../types";
import { 
  Boxes, Search, Plus, Trash2, Edit2, ShieldAlert, TrendingDown,
  ArrowUpDown, X, Layers, ShoppingBag, Settings, RefreshCw, Eye
} from "lucide-react";

interface InventoryManagerProps {
  materials: Material[];
  adjustments: StockAdjustment[];
  onAddMaterial: (material: Omit<Material, "id">) => void;
  onUpdateMaterial: (id: string, updates: Partial<Material>) => void;
  onDeleteMaterial: (id: string) => void;
  onAdjustStock: (id: string, adjustment: { type: "add" | "remove" | "reconcile"; quantity: number; description: string }) => void;
  currency: string;
}

export default function InventoryManager({
  materials,
  adjustments,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onAdjustStock,
  currency
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  
  // Modals / forms toggle
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Add/Edit Form Fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Metals");
  const [unit, setUnit] = useState("kg");
  const [defaultPurchaseRate, setDefaultPurchaseRate] = useState("0");
  const [defaultSalesRate, setDefaultSalesRate] = useState("0");
  const [minStockLevel, setMinStockLevel] = useState("50");
  const [currentStock, setCurrentStock] = useState("0");

  // Adjustment fields
  const [adjType, setAdjType] = useState<"add" | "remove" | "reconcile">("add");
  const [adjQty, setAdjQty] = useState("10");
  const [adjNotes, setAdjNotes] = useState("");

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const materialAdjustments = adjustments
    .filter(adj => adj.materialId === selectedMaterialId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Unique categories list
  const categories = ["All", ...Array.from(new Set(materials.map(m => m.category)))];

  // Filtering materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All" || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const startAdd = () => {
    setName("");
    setSku("");
    setCategory("Metals");
    setUnit("kg");
    setDefaultPurchaseRate("0");
    setDefaultSalesRate("0");
    setMinStockLevel("50");
    setCurrentStock("0");
    setIsAdding(true);
    setIsEditing(false);
    setIsAdjusting(false);
  };

  const startEdit = (m: Material) => {
    setName(m.name);
    setSku(m.sku);
    setCategory(m.category);
    setUnit(m.unit);
    setDefaultPurchaseRate(String(m.defaultPurchaseRate));
    setDefaultSalesRate(String(m.defaultSalesRate));
    setMinStockLevel(String(m.minStockLevel));
    setCurrentStock(String(m.currentStock));
    setIsEditing(true);
    setIsAdding(false);
    setIsAdjusting(false);
  };

  const startAdjust = (m: Material) => {
    setSelectedMaterialId(m.id);
    setAdjType("add");
    setAdjQty("10");
    setAdjNotes("Reconciliation update");
    setIsAdjusting(true);
    setIsAdding(false);
    setIsEditing(false);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name,
      sku: sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      category,
      unit,
      defaultPurchaseRate: Number(defaultPurchaseRate) || 0,
      defaultSalesRate: Number(defaultSalesRate) || 0,
      minStockLevel: Number(minStockLevel) || 10,
      currentStock: Number(currentStock) || 0
    };

    if (isEditing && selectedMaterialId) {
      onUpdateMaterial(selectedMaterialId, data);
      setIsEditing(false);
    } else {
      onAddMaterial(data);
      setIsAdding(false);
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMaterialId) {
      onAdjustStock(selectedMaterialId, {
        type: adjType,
        quantity: Number(adjQty) || 0,
        description: adjNotes || "Manual verification adjustment"
      });
      setIsAdjusting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this material from the catalog? This will delete stock adjustment histories.")) {
      onDeleteMaterial(id);
      setSelectedMaterialId(null);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-5 h-full text-xs animate-fade-in">
      
      {/* Materials catalog grid - Left column */}
      <div className="col-span-12 md:col-span-8 glass-card rounded-2xl overflow-hidden flex flex-col h-full">
        {/* Search Header */}
        <div className="p-3.5 border-b border-border-sand/30 bg-card-soft/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/60" />
              <input 
                type="text" 
                placeholder="Search material SKU or name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-card-soft/60 border border-border-sand rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
              />
            </div>
            
            {/* Category selection */}
            <select
              value={activeCategory}
              onChange={e => setActiveCategory(e.target.value)}
              className="px-3 py-1.5 border border-border-sand rounded-xl bg-card-soft/60 text-xs font-bold text-charcoal focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={startAdd}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1 self-stretch sm:self-auto shrink-0 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Material
          </button>
        </div>

        {/* Materials Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto max-h-[500px] no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-card-soft/40 text-stone font-extrabold uppercase tracking-wider text-[10px] border-b border-border-sand/30">
                <th className="px-4 py-2.5">SKU / Item</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Sales Rate</th>
                <th className="px-4 py-2.5">Purchase Rate</th>
                <th className="px-4 py-2.5 text-right">Qty On Hand</th>
                <th className="px-4 py-2.5 text-right">Min Safe</th>
                <th className="px-4 py-2.5 text-right">Stock Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-sand/20 font-bold text-stone">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone">
                    No matching catalog materials found.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map(m => {
                  const isLow = m.currentStock <= m.minStockLevel;
                  const isCritical = m.currentStock <= m.minStockLevel * 0.3;

                  return (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-card-soft/30 cursor-pointer transition-colors ${selectedMaterialId === m.id ? "bg-primary/10" : ""}`}
                      onClick={() => { setSelectedMaterialId(m.id); setIsAdding(false); setIsEditing(false); setIsAdjusting(false); }}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-extrabold text-charcoal">{m.name}</p>
                        <p className="text-[9px] text-stone/70 font-mono mt-0.5">{m.sku}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="bg-card-soft/80 text-stone px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold">
                          {m.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-charcoal">{currency}{m.defaultSalesRate}/{m.unit}</td>
                      <td className="px-4 py-2.5 font-mono text-stone">{currency}{m.defaultPurchaseRate}/{m.unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-extrabold text-charcoal">
                        {m.currentStock} <span className="text-[10px] text-stone font-normal">{m.unit}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-stone">{m.minStockLevel}</td>
                      <td className="px-4 py-2.5 text-right">
                        {isCritical ? (
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 font-extrabold rounded-full text-[9px]">CRITICAL</span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 font-extrabold rounded-full text-[9px]">LOW</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary-dark font-extrabold rounded-full text-[9px]">HEALTHY</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => startAdjust(m)}
                            className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary-dark rounded-xl transition-all" 
                            title="Quick Stock Refill / Adjustment"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => startEdit(m)}
                            className="p-1.5 bg-card-soft hover:bg-card-soft/80 text-stone rounded-xl border border-border-sand/30 transition-all"
                            title="Edit Material Specs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-all"
                            title="Purge Catalog Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust, Add/Edit forms, or Logs sidebar - Right column */}
      <div className="col-span-12 md:col-span-4 glass-card rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
        
        {/* ADD / EDIT MATERIAL FORM */}
        {isAdding || isEditing ? (
          <form onSubmit={handleSaveMaterial} className="p-4 space-y-3 flex flex-col h-full bg-card-soft/10">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-2">
              <h3 className="font-extrabold text-charcoal text-xs uppercase tracking-wider font-display">
                {isAdding ? "Add Catalog Material" : "Edit Material Specs"}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                className="p-1.5 text-stone hover:text-charcoal bg-card-soft rounded-lg border border-border-sand/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Material Name *</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Aluminum Sheets (2mm)" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">SKU Code (Unique ID)</label>
                <input 
                  type="text" 
                  value={sku}
                  onChange={e => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g., AL-2MM-P" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Category</label>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold focus:ring-1 focus:ring-primary text-charcoal focus:outline-none"
                  >
                    <option value="Metals">Metals</option>
                    <option value="Chemicals">Chemicals</option>
                    <option value="Fasteners">Fasteners</option>
                    <option value="Gases">Industrial Gases</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Other">Other Goods</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Unit of Measure</label>
                  <input 
                    type="text" 
                    required
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="kg, sheets, liters" 
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Purchase Rate ({currency})</label>
                  <input 
                    type="number" 
                    value={defaultPurchaseRate}
                    onChange={e => setDefaultPurchaseRate(e.target.value)}
                    placeholder="0.00" 
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Sales Rate ({currency})</label>
                  <input 
                    type="number" 
                    value={defaultSalesRate}
                    onChange={e => setDefaultSalesRate(e.target.value)}
                    placeholder="0.00" 
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Low Stock Warning Level</label>
                  <input 
                    type="number" 
                    value={minStockLevel}
                    onChange={e => setMinStockLevel(e.target.value)}
                    placeholder="50" 
                    className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                  />
                </div>

                {isAdding && (
                  <div>
                    <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Initial Stock Qty</label>
                    <input 
                      type="number" 
                      value={currentStock}
                      onChange={e => setCurrentStock(e.target.value)}
                      placeholder="0" 
                      className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                    />
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl shadow-md mt-4 shrink-0 text-xs transition-all active:scale-[0.98]"
            >
              {isAdding ? "Save Item Catalog" : "Apply Spec Changes"}
            </button>
          </form>
        ) : isAdjusting && selectedMaterial ? (
          
          /* ADJUST STOCK FORM */
          <form onSubmit={handleAdjustSubmit} className="p-4 space-y-3 flex flex-col h-full bg-card-soft/10">
            <div className="flex justify-between items-center border-b border-border-sand/30 pb-2">
              <h3 className="font-extrabold text-charcoal text-xs uppercase tracking-wider font-display">
                Adjust: {selectedMaterial.name}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAdjusting(false)}
                className="p-1.5 text-stone hover:text-charcoal bg-card-soft rounded-lg border border-border-sand/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div className="bg-primary/10 p-3 rounded-2xl border border-border-sand/20">
                <p className="text-stone font-bold">Current Catalog Balance:</p>
                <p className="text-xl font-extrabold text-primary-dark mt-1">
                  {selectedMaterial.currentStock} {selectedMaterial.unit}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Adjustment Action</label>
                <select 
                  value={adjType}
                  onChange={e => setAdjType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold focus:ring-1 focus:ring-primary focus:outline-none text-charcoal"
                >
                  <option value="add">Add Inward Stock (Delivery / Stock refill)</option>
                  <option value="remove">Remove Outward Stock (Dispatched / Consumed)</option>
                  <option value="reconcile">Manually Reconcile Count (Re-audit count)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Adjustment Quantity</label>
                <input 
                  type="number" 
                  required
                  value={adjQty}
                  onChange={e => setAdjQty(e.target.value)}
                  placeholder="10" 
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-semibold text-charcoal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Adjustment Reasons / Notes</label>
                <textarea 
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  placeholder="e.g., Received stock from supplier Apex Steel" 
                  className="w-full h-16 px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none resize-none font-semibold text-charcoal"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl shadow-md mt-4 shrink-0 text-xs transition-all active:scale-[0.98]"
            >
              Verify Stock Adjustment
            </button>
          </form>
        ) : selectedMaterial ? (
          
          /* VIEW STOCK LOGS */
          <div className="p-4 flex flex-col h-full bg-card-soft/10">
            <div className="flex justify-between items-start border-b border-border-sand/30 pb-2">
              <div>
                <h3 className="font-extrabold text-charcoal text-xs font-display">{selectedMaterial.name}</h3>
                <p className="text-[9px] text-stone font-semibold mt-0.5">{selectedMaterial.sku} • {selectedMaterial.category}</p>
              </div>
              <button 
                onClick={() => startAdjust(selectedMaterial)}
                className="px-2.5 py-1 bg-primary hover:bg-primary-dark text-card-soft font-extrabold rounded-xl flex items-center gap-1 text-[10px] transition-all"
              >
                Adjust
              </button>
            </div>

            <div className="my-3 space-y-1.5 text-[10px]">
              <div className="flex justify-between font-bold">
                <span className="text-stone">Total Quantity on hand:</span>
                <span className="text-charcoal font-mono">{selectedMaterial.currentStock} {selectedMaterial.unit}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-stone">Alert Threshold limit:</span>
                <span className="text-amber-600 font-mono">{selectedMaterial.minStockLevel} {selectedMaterial.unit}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-stone">Standard Sales Value:</span>
                <span className="text-charcoal font-mono">{currency}{selectedMaterial.defaultSalesRate}</span>
              </div>
            </div>

            {/* Historical adjustments table */}
            <h4 className="font-extrabold text-stone text-[9px] uppercase tracking-wider mb-2">Audit Adjustments Log</h4>
            <div className="flex-1 overflow-y-auto divide-y divide-border-sand/20 max-h-[250px] border border-border-sand/30 rounded-2xl bg-card-soft/20 p-2.5 no-scrollbar">
              {materialAdjustments.length === 0 ? (
                <div className="text-center py-6 text-stone font-bold">No stock updates logged yet.</div>
              ) : (
                materialAdjustments.map(adj => (
                  <div key={adj.id} className="py-1.5 text-[10px] flex items-start gap-1 justify-between font-bold">
                    <div className="flex-1 pr-2">
                      <p className="text-stone/60 font-mono">{adj.date}</p>
                      <p className="text-charcoal font-semibold mt-0.5">{adj.description}</p>
                    </div>
                    <span className={`font-mono font-extrabold shrink-0 ${
                      adj.type === "add" ? "text-primary-dark" :
                      adj.type === "remove" ? "text-rose-600" : "text-stone"
                    }`}>
                      {adj.type === "add" ? "+" : adj.type === "remove" ? "-" : ""}{adj.quantity}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Empty Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone text-center bg-card-soft/10">
            <Boxes className="w-10 h-10 text-stone/40 mb-2 animate-pulse" />
            <h4 className="font-bold text-charcoal font-display">No Material Selected</h4>
            <p className="max-w-xs mt-1 text-[11px] font-medium">Select a material item from the catalog directory list to check real-time stock-inward, safety warnings, and purchase/sales rate specs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
