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

const CommandBar: React.FC<CommandBarProps> = ({ onSelect, isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    }
  }, [isOpen]);

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
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
      if (e.key === "Enter" && filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex].view);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-slate-900/20 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative flex items-center px-4 py-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search feature..."
            className="flex-1 bg-transparent border-none outline-none text-slate-800 text-base placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md">
            <Command className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500">K</span>
          </div>
          <button 
            onClick={onClose}
            title="Close Search"
            className="ml-4 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No results found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`${item.hubLabel}-${item.view}`}
                  onClick={() => {
                    onSelect(item.view);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                    isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mt-1">
                      {item.hubLabel}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                      ENTER <span className="opacity-50">↵</span>
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
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
