import React from "react";
import WarehousePage from "./WarehousePage";

export const AssetsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Logistics & Assets Hub
          </h1>
          <p className="text-slate-500">
            Unified management of equipment, consumables, and warehouse stock
          </p>
        </div>
      </div>

      <div className="pt-4">
        <WarehousePage />
      </div>
    </div>
  );
};

export default AssetsPage;
