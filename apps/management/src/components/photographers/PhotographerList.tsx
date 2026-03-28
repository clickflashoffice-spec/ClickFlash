import React from "react";
import { Photographer } from "../../types.ts";
import { useCurrency } from "../CurrencyContext.tsx";

interface PhotographerRowProps {
  photographer: Photographer & {
    totalSales: number;
    orderCount: number;
    photoCount: number;
  };
  onOpenModal: (type: "workingTime" | "objectives" | "history" | "edit", photographer: Photographer) => void;
  style: React.CSSProperties;
}

export const PhotographerRow: React.FC<PhotographerRowProps> = ({
  photographer,
  onOpenModal,
  style,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div
      style={style}
      className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors px-4 min-h-[64px]"
    >
      <div className="w-[30%] flex items-center gap-3 py-2">
        <img
          src={photographer.avatarUrl || "https://i.imgur.com/3Y2j2s2.png"}
          alt={photographer.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-slate-800">{photographer.name}</p>
          <p className="text-xs text-slate-500">{photographer.specialty}</p>
        </div>
      </div>
      <div className="w-[15%]">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            photographer.role === "Admin"
              ? "bg-purple-100 text-purple-600"
              : "bg-cyan-100 text-cyan-600"
          }`}
        >
          {photographer.role}
        </span>
      </div>
      <div className="w-[10%] text-center text-slate-700 font-medium">
        {photographer.orderCount}
      </div>
      <div className="w-[15%] text-center text-slate-700 font-medium">
        {photographer.photoCount.toLocaleString()}
      </div>
      <div className="w-[15%] text-right font-bold text-green-600">
        {formatCurrency(photographer.totalSales)}
      </div>
      <div className="w-[15%] text-right">
        <button
          onClick={() => onOpenModal("edit", photographer)}
          className="text-cyan-600 hover:text-cyan-800 text-sm font-medium"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

interface PhotographerListProps {
  photographers: (Photographer & {
    totalSales: number;
    orderCount: number;
    photoCount: number;
  })[];
  onOpenModal: (type: "workingTime" | "objectives" | "history" | "edit", photographer: Photographer) => void;
  containerHeight: number;
}

export const PhotographerList: React.FC<PhotographerListProps> = ({
  photographers,
  onOpenModal,
  containerHeight,
}) => {
  if (!photographers.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        No photographers found
      </div>
    );
  }

  const RowRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const p = photographers[index];
    if (!p) return null;
    return <PhotographerRow style={style} photographer={p} onOpenModal={onOpenModal} />;
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center bg-slate-50 border-b border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <div className="w-[30%]">Photographer</div>
        <div className="w-[15%]">Role</div>
        <div className="w-[10%] text-center">Orders</div>
        <div className="w-[15%] text-center">Photos</div>
        <div className="w-[15%] text-right">Sales</div>
        <div className="w-[15%] text-right">Actions</div>
      </div>
      <div style={{ height: containerHeight }}>
        {photographers.map((p, index) => (
          <PhotographerRow
            key={p.id}
            style={{ height: 64 }}
            photographer={p}
            onOpenModal={onOpenModal}
          />
        ))}
      </div>
    </div>
  );
};

export default PhotographerList;