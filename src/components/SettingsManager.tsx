import React, { useState, useRef } from "react";
import { 
  Settings, Save, RefreshCw, Trash2, ShieldCheck, HelpCircle, 
  User, CheckCircle, CreditCard, Landmark, Percent, QrCode, Upload
} from "lucide-react";

interface SettingsManagerProps {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessGstin: string;
  gstRate: number;
  currency: string;
  qrCodeUrl: string;
  onSaveSettings: (settings: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessGstin: string;
    gstRate: number;
    currency: string;
    qrCodeUrl?: string;
  }) => Promise<void> | void;
  onWipeDatabase: () => void;
}

export default function SettingsManager({
  businessName,
  businessAddress,
  businessPhone,
  businessGstin,
  gstRate,
  currency,
  qrCodeUrl,
  onSaveSettings,
  onWipeDatabase
}: SettingsManagerProps) {
  // Local Form states
  const [bName, setBName] = useState(businessName);
  const [bAddress, setBAddress] = useState(businessAddress);
  const [bPhone, setBPhone] = useState(businessPhone);
  const [bGstin, setBGstin] = useState(businessGstin);
  const [gRate, setGRate] = useState(String(gstRate));
  const [curr, setCurr] = useState(currency);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        await onSaveSettings({
          businessName: bName,
          businessAddress: bAddress,
          businessPhone: bPhone,
          businessGstin: bGstin,
          gstRate: Number(gRate) || 18,
          currency: curr,
          qrCodeUrl: base64Data
        });
      } catch (err) {
        console.error("Failed to upload/change QR code", err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQrRemove = async () => {
    if (confirm("Are you sure you want to remove the Payment QR Code?")) {
      setIsUploading(true);
      try {
        await onSaveSettings({
          businessName: bName,
          businessAddress: bAddress,
          businessPhone: bPhone,
          businessGstin: bGstin,
          gstRate: Number(gRate) || 18,
          currency: curr,
          qrCodeUrl: "" // Clear QR code
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {
        console.error("Failed to remove QR code", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      businessName: bName,
      businessAddress: bAddress,
      businessPhone: bPhone,
      businessGstin: bGstin,
      gstRate: Number(gRate) || 18,
      currency: curr
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleWipe = () => {
    if (confirm("CRITICAL WARNING: This action is irreversible. This will purge all active Invoices, Quotes, Ledger entries, and Material catalogs, resetting your ledger to pristine default sandbox values. Continue?")) {
      onWipeDatabase();
      alert("Database reset successfully completed.");
      window.location.reload();
    }
  };

  return (
    <div className="grid grid-cols-12 gap-5 text-xs font-sans animate-fade-in">
      
      {/* Settings Form - Left/Center Column */}
      <form onSubmit={handleSubmit} className="col-span-12 md:col-span-8 glass-card rounded-2xl overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b border-border-sand/30 bg-card-soft/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary animate-spin-slow" />
            <div>
              <h3 className="font-bold text-charcoal text-xs font-display uppercase tracking-wider">Business Identity Profile & Parameters</h3>
              <p className="text-[10px] text-stone font-medium">Configure invoices header details, tax bracket splits, and base currency assets.</p>
            </div>
          </div>
          <button 
            type="submit" 
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" /> Save Specs
          </button>
        </div>

        {savedSuccess && (
          <div className="mx-4 mt-4 p-3 bg-primary/20 border border-primary-dark/20 text-primary-dark font-bold rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Global Business Settings Applied Successfully!
          </div>
        )}

        <div className="p-5 space-y-4 flex-1">
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Corporate Legal Entity Name *</label>
              <input 
                type="text" 
                required
                value={bName}
                onChange={e => setBName(e.target.value)}
                placeholder="e.g., VSR Enterprises" 
                className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-bold text-charcoal"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Registered GSTIN Tax ID</label>
              <input 
                type="text" 
                value={bGstin}
                onChange={e => setBGstin(e.target.value.toUpperCase())}
                placeholder="e.g., 24AAACV1234A1Z5" 
                className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-mono text-charcoal uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Support Desk Telephone line *</label>
              <input 
                type="tel" 
                required
                value={bPhone}
                onChange={e => setBPhone(e.target.value)}
                placeholder="e.g., +91 98765 43210" 
                className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-bold text-charcoal"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Base Currency Symbol</label>
                <select 
                  value={curr}
                  onChange={e => setCurr(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 font-bold text-charcoal focus:outline-none"
                >
                  <option value="₹">₹ INR (Indian Rupee)</option>
                  <option value="$">$ USD (United States Dollar)</option>
                  <option value="€">€ EUR (Euro)</option>
                  <option value="£">£ GBP (British Pound)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Default GST Tax (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    value={gRate}
                    onChange={e => setGRate(e.target.value)}
                    className="w-full pl-2.5 pr-8 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-extrabold text-charcoal"
                  />
                  <Percent className="w-3.5 h-3.5 text-stone/60 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold text-stone uppercase mb-0.5">Physical Registered Office Address</label>
              <textarea 
                value={bAddress}
                onChange={e => setBAddress(e.target.value)}
                placeholder="Registered warehouse physical location" 
                className="w-full h-20 px-2.5 py-1.5 border border-border-sand rounded-xl bg-card-soft/40 focus:ring-1 focus:ring-primary focus:outline-none font-bold text-charcoal resize-none"
              />
            </div>
          </div>

          <div className="bg-primary/5 p-3.5 rounded-2xl border border-border-sand/25 flex items-start gap-2.5 text-charcoal font-bold">
            <ShieldCheck className="w-4 h-4 text-primary-dark shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-primary-dark">Tax compliance (CGST & SGST Split Invoice Engine)</p>
              <p className="text-[10px] mt-0.5 text-stone font-semibold leading-normal font-sans">
                By entering GSTIN details and your default GST tax, VSR Ledger dynamically generates compliant invoices split equally into CGST & SGST indices. Ensure your billing complies with national commerce rules.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Database Reset & Help Column - Right */}
      <div className="col-span-12 md:col-span-4 space-y-4">
        
        {/* WIPE CARD */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <h4 className="font-extrabold text-charcoal text-xs uppercase tracking-wider font-display">System Integrity Reset</h4>
          </div>
          <p className="text-[10px] text-stone font-bold leading-relaxed">
            Purges physical files, clears invoice statements, wipes transaction ledger trails, resetting everything to default preloaded dummy items safely.
          </p>
          <button 
            type="button" 
            onClick={handleWipe}
            className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-[10px] uppercase transition-all active:scale-[0.98]"
          >
            Wipe Ledger Records
          </button>
        </div>

        {/* PAYMENT QR CODE CARD */}
        <div className="glass-card p-4 space-y-3 flex flex-col">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <h4 className="font-extrabold text-charcoal text-xs uppercase tracking-wider font-display">Payment QR Code</h4>
          </div>
          <p className="text-[10px] text-stone font-bold leading-relaxed">
            Attach a digital UPI payment QR code image. This QR will be embedded directly onto active invoices and PDF statements for seamless remittance.
          </p>

          {/* QR Preview Area */}
          <div className="relative flex-1 min-h-[140px] flex items-center justify-center border border-dashed border-border-sand/40 bg-card-soft/25 rounded-2xl p-3">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                <span className="text-[9px] text-stone font-extrabold uppercase tracking-wider">Syncing Ledger...</span>
              </div>
            ) : qrCodeUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img 
                  src={qrCodeUrl} 
                  alt="Business UPI QR" 
                  className="w-28 h-28 object-contain rounded-xl border border-border-sand/30 bg-white p-1 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[8px] font-mono font-bold text-stone">Active Code Registered</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-center py-4 text-stone/50">
                <QrCode className="w-10 h-10 stroke-[1.25]" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider">No QR Code Uploaded</span>
                <span className="text-[8px] max-w-[160px] font-semibold">Select a file to attach your corporate UPI code</span>
              </div>
            )}
          </div>

          {/* Upload/Remove Action buttons */}
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleQrUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-card-soft font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-[10px] uppercase transition-all active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" /> 
              {qrCodeUrl ? "Change QR" : "Upload QR"}
            </button>
            {qrCodeUrl && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleQrRemove}
                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 disabled:opacity-50 font-extrabold rounded-xl flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
                title="Remove QR Code"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* BANK INFORMATION REMITTANCE BOX */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            <h4 className="font-extrabold text-charcoal text-xs uppercase tracking-wider font-display">VSR Remittance Details</h4>
          </div>
          <div className="space-y-1.5 text-stone font-extrabold text-[10px]">
            <p>Bank: <span className="font-extrabold text-charcoal font-mono">State Bank of India</span></p>
            <p>A/c Number: <span className="font-extrabold text-charcoal font-mono">300412891223</span></p>
            <p>IFSC Code: <span className="font-extrabold text-charcoal font-mono">SBIN0001043</span></p>
            <p>UPI Handle: <span className="font-extrabold text-charcoal font-mono">vsrenterprises@upi</span></p>
          </div>
          <div className="p-2 bg-card-soft/40 border border-border-sand/20 rounded-xl text-stone font-bold leading-normal text-[9px]">
            Remittance values are hardcoded in tax templates to speed up client processing. Modify this inside invoices layout.
          </div>
        </div>

      </div>
    </div>
  );
}
