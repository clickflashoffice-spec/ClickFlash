import React, { useState, useEffect } from "react";
import { apiService } from "../../../services/apiService";
import { Destination } from "../../../types";
import Spinner from "../../common/Spinner";
import { logger } from "@/utils/logger";

const GlobalFeatureSettings: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // State tracks feature flags for each destination ID
  const [featureFlags, setFeatureFlags] = useState<
    Record<string, { ai: boolean; face: boolean; watermark: boolean }>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dests = await apiService.getDestinations();
        setDestinations(dests);

        // Initialize flags from API data
        const flags: Record<string, { ai: boolean; face: boolean; watermark: boolean }> = {};
        dests.forEach((d) => {
          flags[d.id] = d.features || { ai: true, face: true, watermark: true };
        });
        setFeatureFlags(flags);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleFeature = (
    destId: string,
    feature: "ai" | "face" | "watermark",
  ) => {
    setFeatureFlags((prev) => ({
      ...prev,
      [destId]: {
        ...prev[destId],
        [feature]: !prev[destId][feature],
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update all destinations in parallel
      await Promise.all(
        destinations.map((dest) => {
          const features = featureFlags[dest.id];
          if (features) {
            return apiService.updateDestination(dest.id, { ...dest, features });
          }
          return Promise.resolve();
        }),
      );
      alert(
        "Global feature configuration saved. Updates will be pushed to Master Portals during next sync.",
      );
    } catch (error) {
      logger.error("Failed to save global features", error);
      alert("Error saving features. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
          Global Feature <span className="text-cyan-600">Configuration</span>
        </h2>
        <button
          onClick={handleSave}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
        >
          Push Updates
        </button>
      </div>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-2xl font-medium">
        Control which premium features are enabled for each destination.
        Disabling a feature here will hide it from the Master Portal interface
        at that location.
      </p>

      <div className="space-y-4">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-cyan-200 transition-colors"
          >
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {dest.name}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {dest.country} • {dest.type}
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureFlags[dest.id]?.ai}
                    onChange={() => toggleFeature(dest.id, "ai")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Generative AI
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureFlags[dest.id]?.face}
                    onChange={() => toggleFeature(dest.id, "face")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Face Search
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureFlags[dest.id]?.watermark}
                    onChange={() => toggleFeature(dest.id, "watermark")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Dynamic Watermark
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalFeatureSettings;
