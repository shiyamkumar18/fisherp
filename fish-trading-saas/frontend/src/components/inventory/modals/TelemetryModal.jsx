import React from "react";
import { Activity, X, MapPin } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { TEMP_LOGIC } from "../shared/constants";
import { TempBadge } from "../shared/TempBadge";

export function TelemetryModal({
  telemetryModalOpen, setTelemetryModalOpen, selectedItem,
  storageLocation, setStorageLocation,
  binNumber, setBinNumber,
  rackNumber, setRackNumber,
  currentTemperature, setCurrentTemperature,
  handleSubmit, isSubmitting
}) {
  return (
    <Dialog open={telemetryModalOpen} onOpenChange={setTelemetryModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-modal border-border shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh]">
          {selectedItem && (() => {
            const modalTempState = TEMP_LOGIC.getTempState(currentTemperature);
            const isExpired      = selectedItem.status === "expired";
            const selDays2       = EXPIRY_LOGIC.getDaysLeft(selectedItem.expiry_date);
            const selExpiry2     = EXPIRY_LOGIC.getState(selDays2);

            return (
              <>
                {/* Left Panel — Location Control */}
                <div className="w-full md:w-5/12 bg-surface border-b md:border-b-0 md:border-r border-border flex flex-col p-6 md:p-8 overflow-y-auto">
                  {/* ID Header */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 text-primary mb-3">
                      <Warehouse size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Storage Control Panel</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-14 h-14 rounded-2xl bg-bg border border-border flex items-center justify-center text-3xl shrink-0 shadow">🐟</div>
                      <div>
                        <h3 className="text-2xl font-black text-textPrimary leading-tight">{selectedItem.fish_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest bg-border/50 px-1.5 py-0.5 rounded font-mono">
                            {selectedItem.batch_number}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_CLS[selectedItem.status] || STATUS_CLS.in_stock}`}>
                            {selectedItem.status_display || selectedItem.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Health Badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold
                      ${modalTempState === "optimal" && !isExpired
                        ? "bg-success/10 border-success/20 text-success"
                        : "bg-danger/10 border-danger/20 text-danger"}`}>
                      {modalTempState === "optimal" && !isExpired ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                      {modalTempState === "optimal" && !isExpired ? "Healthy Storage" : "Storage At Risk"}
                    </div>
                  </div>

                  {/* Location Fields */}
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Cold Room / Location</label>
                      <Input
                        disabled={!isEditable}
                        className="h-12 bg-bg text-sm font-bold"
                        value={storageLocation}
                        onChange={(e) => setStorageLocation(e.target.value)}
                        placeholder="e.g. Cold Room A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Rack Number</label>
                        <Input disabled={!isEditable} className="h-12 bg-bg font-bold text-center" value={rackNumber} onChange={(e) => setRackNumber(e.target.value)} placeholder="R-2" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Bin Number</label>
                        <Input disabled={!isEditable} className="h-12 bg-bg font-bold text-center" value={binNumber} onChange={(e) => setBinNumber(e.target.value)} placeholder="B-12" />
                      </div>
                    </div>
                  </div>

                  {/* Status Matrix */}
                  <div className="mt-6 pt-5 border-t border-border space-y-2">
                    <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-3">System Status</p>
                    {[
                      { label: "Stock level",    ok: (selectedItem.remaining_packages || 0) > 0 },
                      { label: "Quality grade",  ok: selectedItem.status !== "expired" && selectedItem.status !== "spoilage_risk" },
                      { label: "Shelf life",     ok: selExpiry2 === "healthy" || selExpiry2 === "unknown" },
                    ].map(({ label, ok }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${ok ? "bg-success shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-danger shadow-[0_0_6px_rgba(239,68,68,0.4)]"}`} />
                        <span className="text-xs font-bold text-textPrimary">{label} — <span className={ok ? "text-success" : "text-danger"}>{ok ? "OK" : "Issue"}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Panel — Temperature Monitor */}
                <div className="w-full md:w-7/12 bg-card flex flex-col p-6 md:p-8 relative overflow-y-auto">
                  {/* Close button */}
                  <button
                    onClick={() => setTelemetryModalOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-border text-textSecondary transition-colors z-10"
                  >
                    <X size={18} />
                  </button>

                  {/* Monitor title */}
                  <div className="flex items-center gap-2 mb-8">
                    <Activity size={16} className="text-primary" />
                    <h2 className="text-[10px] font-black text-textSecondary uppercase tracking-widest">Live Telemetry Monitor</h2>
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {/* Temperature Dial */}
                  <div className="flex flex-col items-center flex-1 justify-center py-4">
                    <div className="relative mb-6">
                      {/* Ambient glow */}
                      <div className={`absolute inset-0 rounded-full blur-3xl opacity-25 scale-75 ${TEMP_LOGIC.getGlowClass(modalTempState)}`} />
                      {/* Outer ring */}
                      <div className={`relative w-52 h-52 rounded-full border-8 ${TEMP_LOGIC.getBorderColor(modalTempState)} bg-bg shadow-2xl flex flex-col items-center justify-center z-10`}>
                        {/* Editable temperature input */}
                        <input
                          type="number"
                          step="0.1"
                          disabled={!isEditable}
                          value={currentTemperature}
                          onChange={(e) => setCurrentTemperature(parseFloat(e.target.value) || 0)}
                          className={`w-36 text-5xl font-black text-center bg-transparent border-none outline-none appearance-none
                            ${TEMP_LOGIC.getColor(modalTempState)}
                            ${!isEditable ? "cursor-default" : "cursor-text"}
                          `}
                          style={{ MozAppearance: "textfield" }}
                        />
                        <span className="text-sm font-black text-textSecondary uppercase tracking-widest">°C</span>
                        {!isEditable && (
                          <span className="text-[9px] text-textSecondary font-bold mt-1">READ ONLY</span>
                        )}
                      </div>
                    </div>

                    {/* State badge */}
                    <div className={`px-6 py-2 rounded-full border text-sm font-black uppercase tracking-widest mb-6
                      ${modalTempState === "optimal" ? "bg-success/10 text-success border-success/30"
                      : modalTempState === "warning"  ? "bg-warning/10 text-warning border-warning/30"
                      : "bg-danger/10 text-danger border-danger/30"}`}
                    >
                      {TEMP_LOGIC.getLabel(modalTempState)}
                    </div>

                    {/* Alert Cards */}
                    <div className="w-full max-w-sm space-y-3">
                      {currentTemperature > 2 && (
                        <div className="flex items-start gap-3 bg-danger/10 border border-danger/30 rounded-xl p-4">
                          <ShieldAlert className="text-danger shrink-0 mt-0.5" size={18} />
                          <div>
                            <p className="font-bold text-danger text-sm">⚠ Risk of Spoilage</p>
                            <p className="text-xs text-danger/80 mt-1">Temperature exceeds safe cooling range. Immediate inspection required.</p>
                          </div>
                        </div>
                      )}
                      {isExpired && (
                        <div className="flex items-start gap-3 bg-danger/10 border border-danger/30 rounded-xl p-4">
                          <Calendar className="text-danger shrink-0 mt-0.5" size={18} />
                          <div>
                            <p className="font-bold text-danger text-sm">⚠ Product Expired</p>
                            <p className="text-xs text-danger/80 mt-1">This batch has exceeded its shelf life. Do not dispatch.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reference guide + Submit */}
                  <div className="border-t border-border pt-5 flex items-center justify-between gap-4">
                    <div className="space-y-1 text-[10px] font-bold text-textSecondary">
                      <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success inline-block" />Optimal: -2°C to 2°C</p>
                      <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning inline-block" />Warning: 3°C to 6°C</p>
                      <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger inline-block" />Critical: &gt; 7°C</p>
                    </div>
                    {isEditable ? (
                      <Button onClick={handleSubmit} loading={isSubmitting} className="px-8 shrink-0">
                        Save Telemetry
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setTelemetryModalOpen(false)}>Close</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
  );
}
