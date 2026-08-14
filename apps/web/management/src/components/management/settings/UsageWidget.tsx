import React from "react";
import { HardDrive, Images, Users, AlertTriangle } from "lucide-react";

interface UsageWidgetProps {
  currentTier?: "Free" | "Pro" | "Enterprise";
}

const UsageWidget: React.FC<UsageWidgetProps> = ({ currentTier = "Free" }) => {
  // In a real app, these values would be fetched from the backend.
  // We're mocking them here based on the tier.
  
  const limits = {
    Free: { storage: 10, photos: 500, users: 1 },
    Pro: { storage: 1000, photos: -1, users: -1 }, // -1 means unlimited
    Enterprise: { storage: -1, photos: -1, users: -1 },
  };

  const usage = {
    storage: 8.5, // GB
    photos: 480, // count
    users: 1, // count
  };

  const tierLimits = limits[currentTier];
  
  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const storagePercent = calculatePercentage(usage.storage, tierLimits.storage);
  const photosPercent = calculatePercentage(usage.photos, tierLimits.photos);
  const usersPercent = calculatePercentage(usage.users, tierLimits.users);

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 75) return "bg-amber-500";
    return "bg-cyan-500";
  };

  const isNearingLimit = storagePercent >= 90 || photosPercent >= 90;

  return (
    <div className="bg-[#0b101d] border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">
            Current Usage
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Metrics for your current billing cycle
          </p>
        </div>
        {isNearingLimit && currentTier === "Free" && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Nearing Limits</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Storage Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Storage</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {usage.storage} GB / {tierLimits.storage === -1 ? "Unlimited" : `${tierLimits.storage} GB`}
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(storagePercent)}`}
              style={{ width: `${tierLimits.storage === -1 ? 100 : storagePercent}%` }}
            />
          </div>
        </div>

        {/* Photos Uploaded */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Images className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Photos Uploaded</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {usage.photos} / {tierLimits.photos === -1 ? "Unlimited" : tierLimits.photos}
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(photosPercent)}`}
              style={{ width: `${tierLimits.photos === -1 ? 100 : photosPercent}%` }}
            />
          </div>
        </div>

        {/* Users */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Team Members</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {usage.users} / {tierLimits.users === -1 ? "Unlimited" : tierLimits.users}
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(usersPercent)}`}
              style={{ width: `${tierLimits.users === -1 ? 100 : usersPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {isNearingLimit && currentTier === "Free" && (
        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-xs text-amber-500 font-medium text-center">
            You are approaching your plan limits. Upgrade to Pro for unlimited storage and photos.
          </p>
        </div>
      )}
    </div>
  );
};

export default UsageWidget;
