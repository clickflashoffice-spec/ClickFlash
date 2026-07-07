import React from "react";
import WarehousePage from "./WarehousePage";

interface AssetsPageProps {
  context?: string;
}

export const AssetsPage: React.FC<AssetsPageProps> = ({ context }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Operations</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Assets & Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Equipment, consumables, and warehouse stock</p>
        </div>
      </div>

      <div className="pt-4">
        <WarehousePage />
      </div>
    </div>
  );
};

export default AssetsPage;
