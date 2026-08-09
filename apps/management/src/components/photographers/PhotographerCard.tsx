import React from "react";
import { Photographer } from "../../types.ts";
import { Card } from "@clickflash/ui";
import { useCurrency } from "../CurrencyContext.tsx";

interface PhotographerCardProps {
  photographer: Photographer;
  totalSales: number;
  orderCount: number;
  photoCount: number;
  onOpenModal: (type: "workingTime" | "objectives" | "history" | "edit", photographer: Photographer) => void;
}

export const PhotographerCard: React.FC<PhotographerCardProps> = ({
  photographer,
  totalSales,
  orderCount,
  photoCount,
  onOpenModal,
}) => {
  const { formatCurrency } = useCurrency();

  const target = photographer.monthlyTarget || 0;
  const progress = target > 0 ? (totalSales / target) * 100 : 0;
  const progressPercentage = Math.min(progress, 100);

  return (
    <Card className="text-center flex flex-col items-center hover:shadow-lg transition-all duration-300">
      <div className="relative mb-4">
        <img
          src={photographer.avatarUrl || "https://i.imgur.com/3Y2j2s2.png"}
          alt={photographer.name}
          className="w-24 h-24 rounded-full border-4 border-slate-100 object-cover shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://i.imgur.com/3Y2j2s2.png";
          }}
        />
        {orderCount > 0 && totalSales > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white rounded-full p-1.5 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>
      <h2 className="text-xl font-bold text-slate-900">{photographer.name}</h2>
      <p className="text-slate-500 text-sm">{photographer.specialty}</p>
      <span
        className={`mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
          photographer.role === "Admin"
            ? "bg-purple-100 text-purple-600"
            : "bg-cyan-100 text-cyan-600"
        }`}
      >
        {photographer.role}
      </span>
      <div className="w-full mt-4 grid grid-cols-2 gap-2 text-center border-t border-b py-3 border-slate-100">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Orders
          </p>
          <p className="font-bold text-xl text-slate-900 mt-1">{orderCount}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Photos
          </p>
          <p className="font-bold text-xl text-slate-900 mt-1">
            {photoCount.toLocaleString()}
          </p>
        </div>
      </div>
      {totalSales > 0 && (
        <div className="w-full mt-4 pt-3 border-t border-slate-100">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Total Sales
            </span>
            <span className="font-mono font-bold text-lg text-green-600">
              {formatCurrency(totalSales)}
            </span>
          </div>
        </div>
      )}
      {target > 0 && (
        <div className="w-full mt-4 pt-3 border-t border-slate-100">
          <div className="flex justify-between items-baseline text-xs mb-1">
            <span className="font-mono text-green-600 font-semibold">
              {formatCurrency(totalSales)}
            </span>
            <span className="text-slate-400">{formatCurrency(target)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-1 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                progressPercentage >= 100
                  ? "bg-green-500"
                  : progressPercentage >= 75
                    ? "bg-cyan-500"
                    : progressPercentage >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progressPercentage >= 100 && (
            <p className="text-xs text-green-600 font-semibold mt-1 text-center">
              🎉 Target Achieved!
            </p>
          )}
        </div>
      )}
      <div className="w-full mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-sm">
        <button
          onClick={() => onOpenModal("workingTime", photographer)}
          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-1.5 px-3 rounded-md transition-colors border border-slate-200"
        >
          Hours
        </button>
        <button
          onClick={() => onOpenModal("history", photographer)}
          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-1.5 px-3 rounded-md transition-colors border border-slate-200"
        >
          History
        </button>
        <button
          onClick={() => onOpenModal("objectives", photographer)}
          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-1.5 px-3 rounded-md transition-colors border border-slate-200"
        >
          Goals
        </button>
        <button
          onClick={() => onOpenModal("edit", photographer)}
          className="w-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold py-1.5 px-3 rounded-md transition-colors border border-cyan-100"
        >
          Edit
        </button>
      </div>
    </Card>
  );
};

export default PhotographerCard;