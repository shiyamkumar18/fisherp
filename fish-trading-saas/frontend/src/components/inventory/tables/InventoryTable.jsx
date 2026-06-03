import React from "react";
import { MapPin, Activity, ChevronRight } from "lucide-react";
import { TempBadge } from "../shared/TempBadge";
import { ExpiryBadge } from "../shared/ExpiryBadge";
import { StockBar } from "../shared/StockBar";
import { TEMP_LOGIC, EXPIRY_LOGIC, STATUS_CLS } from "../shared/constants";

export function InventoryTable({ filteredInventory, openDrawer, isEditable, openTelemetryModal }) {
  return (
    <div className="p-0 overflow-hidden hidden md:block">
      <table className="w-full text-left text-sm">
              <thead className="bg-tableHeader border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Batch / Product</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Location</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Stock Level</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-center">Telemetry</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Expiry</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-textSecondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredInventory.map((item) => {
                  const tempState   = TEMP_LOGIC.getTempState(item.current_temperature);
                  const daysLeft    = EXPIRY_LOGIC.getDaysLeft(item.expiry_date);
                  const expiryState = EXPIRY_LOGIC.getState(daysLeft);
                  const isUrgent    = tempState !== "optimal" || expiryState === "expired" || expiryState === "critical";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDrawer(item)}
                      className={`group transition-all duration-200 cursor-pointer
                        hover:bg-hover hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]
                        ${isUrgent ? "bg-danger/[0.02]" : ""}`}
                    >
                      {/* Fish & Batch */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-bg flex items-center justify-center shrink-0 border border-border shadow-sm text-2xl group-hover:scale-110 group-hover:shadow-md transition-all duration-200">
                            🐟
                          </div>
                          <div>
                            <p className="font-bold text-textPrimary text-[15px] leading-snug">{item.fish_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-textSecondary uppercase tracking-widest bg-border/50 px-1.5 py-0.5 rounded font-mono">
                                {item.batch_number}
                              </span>
                              <span className="text-[10px] font-bold text-primary">GRADE A+</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-textSecondary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-textPrimary text-sm">{item.storage_location || "Unassigned"}</p>
                            <p className="text-[11px] text-textSecondary font-bold uppercase tracking-wide mt-0.5">
                              {item.rack_number ? `Rack ${item.rack_number}` : "—"} · {item.bin_number ? `Bin ${item.bin_number}` : "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stock Bar */}
                      <td className="px-6 py-4">
                        <StockBar
                          remaining={item.remaining_packages}
                          initial={item.initial_packages}
                          weightKg={item.remaining_weight_kg}
                        />
                      </td>

                      {/* Telemetry */}
                      <td className="px-6 py-4 text-center">
                        <TempBadge temp={item.current_temperature} />
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4">
                        <ExpiryBadge expiryDate={item.expiry_date} />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block border px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_CLS[item.status] || STATUS_CLS.in_stock}`}>
                          {item.status_display || item.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {isEditable && (
                            <button
                              onClick={(e) => openTelemetryModal(e, item)}
                              title="Update Telemetry"
                              className="h-8 w-8 rounded-lg flex items-center justify-center border border-border text-textSecondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                            >
                              <Activity size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); openDrawer(item); }}
                            title="View Details"
                            className="h-8 w-8 rounded-lg flex items-center justify-center border border-border text-textSecondary hover:bg-hover transition-all"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          
    </div>
  );
}
