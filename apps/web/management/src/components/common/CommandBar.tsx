import React, { useState, useEffect, useRef } from "react";
import { Search, Command, X } from "lucide-react";
import {ManagementView} from "../../constants.ts";

interface CommandBarProps {
  onSelect: (view: ManagementView) => void;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "dashboard" | "operations" | "finance" | "settings";

interface TabItemConfig {
  view: ManagementView;
  label: string;
}

const TAB_ITEMS: Record<TabId, TabItemConfig[]> = {
  dashboard: [
    { view: "executive_dashboard", label: "Executive Dashboard" },
  ],
  operations: [
    { view: "stations_overview", label: "Stations Overview" },
    { view: "orders_sales", label: "Orders & Sales" },
    { view: "assets_inventory", label: "Assets & Inventory" },
    { view: "sync_logs", label: "Sync & Logs" },
  ],
  finance: [
    { view: "revenue_income", label: "Revenue & Income" },
    { view: "expenses_payroll", label: "Expenses & Payroll" },
    { view: "capital_treasury", label: "Capital & Treasury" },
  ],
  settings: [
    { view: "general_settings", label: "General Settings" },
    { view: "staff_management", label: "Staff Management" },
    { view: "session_types", label: "Session Types" },
    { view: "reports_insights", label: "Reports & Insights" },
  ],
};

const TAB_LABELS: Record<TabId, string> = {
  dashboard: "Dashboard",
  operations: "Operations",
  finance: "Finance",
  settings: "Settings",
};

import { fleetService } from "../../services/fleetService";
import { logger } from "../../utils/logger";

const CommandBar: React.FC<CommandBarProps> = ({ onSelect, isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stationItems, setStationItems] = useState<{id: string, label: string, type: string}[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatItems = (Object.keys(TAB_ITEMS) as TabId[]).flatMap(tabId =>
    TAB_ITEMS[tabId].map(item => ({
      ...item,
      hubLabel: TAB_LABELS[tabId]
    }))
  );

  const filteredItems = flatItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.hubLabel.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
      
      // Fetch stations
      fleetService.getStations().then(stations => {
        setStationItems(stations.map(s => ({
          id: s.id,
          label: s.name,
          type: (s as { type?: string }).type || "Master"
        })));
      }).catch(err => logger.error("Failed to fetch stations in CommandBar", { error: err }));
    }
  }, [isOpen]);

  const filteredStations = stationItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );
  
  const totalItems = filteredItems.length + filteredStations.length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Toggle handled by parent
      }
      if (!isOpen) return;

      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => totalItems > 0 ? (prev + 1) % totalItems : 0);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0);
      }
      if (e.key === "Enter") {
        if (selectedIndex < filteredItems.length && filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex].view);
          onClose();
        } else if (selectedIndex >= filteredItems.length && filteredStations[selectedIndex - filteredItems.length]) {
          onSelect("stations_overview");
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, filteredStations, selectedIndex, onSelect, onClose, totalItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300">
        <div className="relative flex items-center px-4 py-4 border-b border-slate-200/50 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search feature..."
            className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white text-base placeholder:text-slate-400 font-medium"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md shadow-sm">
            <Command className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500">K</span>
          </div>
          <button 
            onClick={onClose}
            title="Close Search"
            className="ml-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-3 custom-scrollbar">
          {filteredItems.length === 0 && stationItems.filter(s => s.label.toLowerCase().includes(query.toLowerCase())).length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="w-8 h-8 opacity-20" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.length > 0 && (
                <div>
                  <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pages & Views</h3>
                  <div className="space-y-1">
                    {filteredItems.map((item, index) => {
                      const isSelected = index === selectedIndex;
                      return (
                        <button
                          key={`${item.hubLabel}-${item.view}`}
                          onClick={() => {
                            onSelect(item.view);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                            isSelected 
                              ? "bg-[#38bdf8]/10 text-blue-700 shadow-sm border border-[#38bdf8]/20" 
                              : "hover:bg-slate-50 text-slate-600 border border-transparent"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-[#0284c7]' : ''}`}>{item.label}</span>
                            <span className={`text-[10px] uppercase font-black tracking-widest leading-none mt-1 ${isSelected ? 'text-[#38bdf8]' : 'text-slate-400'}`}>
                              {item.hubLabel}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#0284c7] flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border border-[#38bdf8]/20">
                              ENTER <span className="opacity-50 font-sans">↵</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {stationItems.filter(s => s.label.toLowerCase().includes(query.toLowerCase())).length > 0 && (
                <div>
                  <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Stations & Actions</h3>
                  <div className="space-y-1">
                    {stationItems.filter(s => s.label.toLowerCase().includes(query.toLowerCase())).map((item, index) => {
                      const absoluteIndex = filteredItems.length + index;
                      const isSelected = absoluteIndex === selectedIndex;
                      return (
                        <button
                          key={`station-${item.id}`}
                          onClick={() => {
                            onSelect("stations_overview");
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                            isSelected 
                              ? "bg-[#38bdf8]/10 text-blue-700 shadow-sm border border-[#38bdf8]/20" 
                              : "hover:bg-slate-50 text-slate-600 border border-transparent"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-[#0284c7]' : ''}`}>{item.label}</span>
                            <span className={`text-[10px] uppercase font-black tracking-widest leading-none mt-1 ${isSelected ? 'text-[#38bdf8]' : 'text-slate-400'}`}>
                              {item.type.toUpperCase()} STATION
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#0284c7] flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm border border-[#38bdf8]/20">
                              VIEW <span className="opacity-50 font-sans">↵</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200/50 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-[10px] font-bold text-slate-500">↑↓</span>
              <span className="text-[10px] text-slate-400 font-medium">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-[10px] font-bold text-slate-500">Enter</span>
              <span className="text-[10px] text-slate-400 font-medium">Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm text-[10px] font-bold text-slate-500">Esc</span>
              <span className="text-[10px] text-slate-400 font-medium">Close</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 italic">Redesign v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
