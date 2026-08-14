import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Globe, MapPin, ChevronDown, Building2 } from "lucide-react";

// In a real app, this would be fetched from the backend and structured.
// Mocking a few regions for demonstration of the 100+ scale architecture.
const MOCK_REGIONS = [
  {
    id: "mena",
    name: "Middle East & North Africa",
    locations: [
      { id: "marhaba_club", name: "Marhaba Club (Tunisia)" },
      { id: "marhaba_occidental", name: "Marhaba Occidental (Tunisia)" },
      { id: "marhaba_concorde", name: "Concorde Green Park (Tunisia)" },
      { id: "dubai_resort", name: "Atlantis The Palm (UAE)" },
    ],
  },
  {
    id: "europe",
    name: "Europe",
    locations: [
      { id: "ibiza_gran", name: "Ibiza Gran Hotel (Spain)" },
      { id: "santorini_blue", name: "Santorini Blue (Greece)" },
    ],
  },
  {
    id: "na",
    name: "North America",
    locations: [
      { id: "miami_beach", name: "Miami Beach Resort (USA)" },
      { id: "cancun_palace", name: "Cancun Palace (Mexico)" },
    ],
  },
];

interface GlobalLocationSwitcherProps {
  selectedContext: string;
  onContextChange: (context: string) => void;
}

export const GlobalLocationSwitcher: React.FC<GlobalLocationSwitcherProps> = ({
  selectedContext,
  onContextChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRegions = useMemo(() => {
    if (!searchQuery) return MOCK_REGIONS;
    const lowerQuery = searchQuery.toLowerCase();
    
    return MOCK_REGIONS.map(region => ({
      ...region,
      locations: region.locations.filter(loc => 
        loc.name.toLowerCase().includes(lowerQuery)
      )
    })).filter(region => region.locations.length > 0 || region.name.toLowerCase().includes(lowerQuery));
  }, [searchQuery]);

  // Find the selected location name
  const selectedName = useMemo(() => {
    if (selectedContext === "global") return "Global Enterprise";
    for (const region of MOCK_REGIONS) {
      const loc = region.locations.find(l => l.id === selectedContext);
      if (loc) return loc.name;
    }
    return "Unknown Location";
  }, [selectedContext]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-all shadow-sm min-h-[44px]"
      >
        <div className="bg-sky-500/20 p-1.5 rounded-lg">
          {selectedContext === "global" ? (
            <Globe className="w-4 h-4 text-sky-400" />
          ) : (
            <Building2 className="w-4 h-4 text-sky-400" />
          )}
        </div>
        <div className="flex flex-col items-start hidden sm:flex max-w-[150px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
            Operating Context
          </span>
          <span className="text-sm font-bold text-white truncate w-full">
            {selectedName}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[400px]">
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search 100+ master locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 py-2">
            {!searchQuery && (
              <button
                onClick={() => {
                  onContextChange("global");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  selectedContext === "global" ? "bg-sky-500/10 text-sky-400" : "hover:bg-white/5 text-slate-300"
                }`}
              >
                <Globe className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-sm font-bold">Global Enterprise</p>
                  <p className="text-xs opacity-70">View aggregated data across all regions</p>
                </div>
              </button>
            )}

            {filteredRegions.map(region => (
              <div key={region.id} className="mt-2">
                <div className="px-4 py-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{region.name}</p>
                </div>
                {region.locations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      onContextChange(loc.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 transition-colors ${
                      selectedContext === loc.id ? "bg-sky-500/10 text-sky-400" : "hover:bg-white/5 text-slate-300"
                    }`}
                  >
                    <MapPin className={`w-4 h-4 ${selectedContext === loc.id ? "text-sky-400" : "text-slate-500"}`} />
                    <span className="text-sm font-medium">{loc.name}</span>
                  </button>
                ))}
              </div>
            ))}

            {filteredRegions.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-sm">
                No locations found matching "{searchQuery}"
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-white/10 bg-white/5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Fotiqo Architecture • 100+ Locations
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
