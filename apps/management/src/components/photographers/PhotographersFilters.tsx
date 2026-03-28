import React from "react";
import { Search, X, Filter } from "lucide-react";

interface PhotographersFiltersProps {
  startDate: string;
  endDate: string;
  selectedPhotographerId: number | "all";
  photographers: { id: number; name: string }[];
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPhotographerChange: (id: number | "all") => void;
  onReset: () => void;
}

export const PhotographersFilters: React.FC<PhotographersFiltersProps> = ({
  startDate,
  endDate,
  selectedPhotographerId,
  photographers,
  onStartDateChange,
  onEndDateChange,
  onPhotographerChange,
  onReset,
}) => {
  const hasFilters = startDate || endDate || selectedPhotographerId !== "all";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <h3 className="font-semibold text-slate-700">Filters</h3>
        {hasFilters && (
          <button
            onClick={onReset}
            className="ml-auto text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Photographer
          </label>
          <select
            value={selectedPhotographerId}
            onChange={(e) =>
              onPhotographerChange(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Photographers</option>
            {photographers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PhotographersFilters;