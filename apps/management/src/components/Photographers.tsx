import React, { useState, useMemo, useRef, useEffect } from "react";
// @ts-ignore
import * as ReactWindow from "react-window";
// @ts-ignore
const FixedSizeList = ((ReactWindow as any).default ||
  ReactWindow) as any;
import { Photographer } from "../types.ts";
import Card from "./common/Card.tsx";
import WorkingTimeModal from "./photographers/WorkingTimeModal.tsx";
import ObjectivesModal from "./photographers/ObjectivesModal.tsx";
import ConnexionHistoryModal from "./photographers/ConnexionHistoryModal.tsx";
import UserEditModal from "./modals/UserEditModal.tsx";
import Spinner from "./common/Spinner.tsx";
import { useCurrency } from "./CurrencyContext.tsx";
import IncomeByPhotographerChart from "./photographers/IncomeByPhotographerChart.tsx";
import { usePermissions } from "../hooks/usePermissions.ts";
import { useDebounce } from "../hooks/useDebounce.ts";
import { usePhotographers } from "../hooks/usePhotographers.ts";
import { useOrders } from "../hooks/useOrders.ts";
import StatCard from "./common/StatCard.tsx";
import { PhotographerCard } from "./photographers/PhotographerCard.tsx";
import { PhotographersFilters } from "./photographers/PhotographersFilters.tsx";
import { PhotographersStats } from "./photographers/PhotographersStats.tsx";
import { Search, Grid, List } from "lucide-react";

/**
 * Photographers Component Props
 */
interface PhotographersProps {
  /** Current logged-in user */
  currentUser: Photographer;
}

type ModalType = "workingTime" | "objectives" | "history" | "edit";

const PhotographerPerformanceCard: React.FC<{
  photographer: Photographer;
  totalSales: number;
  orderCount: number;
  photoCount: number;
  onOpenModal: (type: ModalType, photographer: Photographer) => void;
}> = ({ photographer, totalSales, orderCount, photoCount, onOpenModal }) => {
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
          className="w-24 h-24 rounded-full border-4 border-white/10 object-cover shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://i.imgur.com/3Y2j2s2.png";
          }}
        />
        {orderCount > 0 && totalSales > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-[#0f172a] rounded-full p-1.5 shadow-sm">
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
      <h2 className="text-xl font-bold text-white tracking-tight">{photographer.name}</h2>
      <p className="text-slate-400 text-sm font-medium">{photographer.specialty}</p>
      <span
        className={`mt-2 px-2 py-1 rounded-full text-xs font-semibold border ${
          photographer.role === "Admin"
            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
            : "bg-sky-500/10 text-sky-400 border-sky-500/20"
        }`}
      >
        {photographer.role}
      </span>
      <div className="w-full mt-4 grid grid-cols-2 gap-2 text-center border-t border-b py-3 border-white/5">
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            Orders
          </p>
          <p className="font-bold text-xl text-white mt-1">{orderCount}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
            Photos
          </p>
          <p className="font-bold text-xl text-white mt-1">
            {photoCount.toLocaleString()}
          </p>
        </div>
      </div>
      {totalSales > 0 && (
        <div className="w-full mt-4 pt-3 border-t border-white/5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Sales
            </span>
            <span className="font-mono font-bold text-lg text-emerald-400">
              {formatCurrency(totalSales)}
            </span>
          </div>
        </div>
      )}
      {target > 0 && (
        <div className="w-full mt-4 pt-3 border-t border-white/5">
          <div className="flex justify-between items-baseline text-xs mb-1">
            <span className="font-mono text-emerald-400 font-bold">
              {formatCurrency(totalSales)}
            </span>
            <span className="text-slate-500 font-mono font-bold">{formatCurrency(target)}</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2.5 mt-1 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                progressPercentage >= 100
                  ? "bg-emerald-500 shadow-[0_0_10px_#10b981]"
                  : progressPercentage >= 75
                    ? "bg-sky-500"
                    : progressPercentage >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progressPercentage >= 100 && (
            <p className="text-xs text-emerald-400 font-bold mt-1 text-center">
              🎉 Target Achieved!
            </p>
          )}
        </div>
      )}
      <div className="w-full mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-sm">
        <button
          onClick={() => onOpenModal("workingTime", photographer)}
          className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-1.5 px-3 rounded-md transition-colors border border-white/10"
        >
          Hours
        </button>
        <button
          onClick={() => onOpenModal("history", photographer)}
          className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-1.5 px-3 rounded-md transition-colors border border-white/10"
        >
          History
        </button>
        <button
          onClick={() => onOpenModal("objectives", photographer)}
          className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-1.5 px-3 rounded-md transition-colors border border-white/10"
        >
          Goals
        </button>
        <button
          onClick={() => onOpenModal("edit", photographer)}
          className="w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-semibold py-1.5 px-3 rounded-md transition-colors border border-sky-500/20"
        >
          Edit
        </button>
      </div>
    </Card>
  );
};

const Photographers: React.FC<PhotographersProps> = ({ currentUser }) => {
  const {
    data: photographers = [],
    isLoading: isLoadingPhotographers,
    refetch: refetchPhotographers,
  } = usePhotographers();
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useOrders();

  const [modal, setModal] = useState<ModalType | null>(null);
  const [selectedPhotographer, setSelectedPhotographer] =
    useState<Photographer | null>(null);
  const [userToEdit, setUserToEdit] = useState<Photographer | null>(null);
  const { can } = usePermissions(currentUser);
  const { formatCurrency } = useCurrency();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<
    number | "all"
  >("all");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (startDate && order.date < startDate) return false;
      if (endDate && order.date > endDate) return false;
      // Ensure ID comparison is safe
      if (
        selectedPhotographerId !== "all" &&
        Number(order.photographerId) !== Number(selectedPhotographerId)
      )
        return false;

      return true;
    });
  }, [orders, startDate, endDate, selectedPhotographerId]);

  const performanceData = useMemo(() => {
    const dataMap = new Map<
      number,
      { sales: number; orderCount: number; photoCount: number }
    >();

    filteredOrders.forEach((order) => {
      const photId = order.photographerId ? Number(order.photographerId) : null;
      if (photId && order.status === "Completed") {
        const currentData = dataMap.get(photId) || {
          sales: 0,
          orderCount: 0,
          photoCount: 0,
        };
        currentData.sales += Number(order.total);
        currentData.orderCount += 1;
        const photoCountInOrder = order.items.filter(
          (item) => item.photo,
        ).length;
        currentData.photoCount += photoCountInOrder;
        dataMap.set(photId, currentData);
      }
    });

    return photographers.map((p) => ({
      ...p,
      totalSales: dataMap.get(Number(p.id))?.sales || 0,
      orderCount: dataMap.get(Number(p.id))?.orderCount || 0,
      photoCount: dataMap.get(Number(p.id))?.photoCount || 0,
    }));
  }, [filteredOrders, photographers]);

  const kpiData = useMemo(() => {
    const activePhotographers = performanceData.filter((p) => p.orderCount > 0);
    const totalSales = activePhotographers.reduce(
      (sum, p) => sum + p.totalSales,
      0,
    );

    if (activePhotographers.length === 0) {
      return {
        totalPhotographers: photographers.length,
        topPerformer: "N/A",
        mostActive: "N/A",
        averageSales: 0,
      };
    }

    const topPerformer = [...activePhotographers].sort(
      (a, b) => b.totalSales - a.totalSales,
    )[0];
    const mostActive = [...activePhotographers].sort(
      (a, b) => b.orderCount - a.orderCount,
    )[0];
    const averageSales = totalSales / activePhotographers.length;

    return {
      totalPhotographers: photographers.length,
      topPerformer: topPerformer.name,
      mostActive: mostActive.name,
      averageSales,
    };
  }, [performanceData, photographers.length]);

  const openModal = (type: ModalType, photographer: Photographer) => {
    if (type === "edit") {
      setUserToEdit(photographer);
    }
    setSelectedPhotographer(photographer);
    setModal(type);
  };

  const closeModal = () => {
    setSelectedPhotographer(null);
    setUserToEdit(null);
    setModal(null);
  };

  const handleSaveObjective = () => {
    refetchPhotographers();
    closeModal();
  };

  const refreshData = () => {
    refetchPhotographers();
    refetchOrders();
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedPhotographerId("all");
  };

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Virtualization refs/state
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Resize observer for virtualization
  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(containerRef.current);
    updateHeight();
    return () => observer.disconnect();
  }, [viewMode, isLoadingPhotographers]);

  const filteredPerformanceData = useMemo(() => {
    if (!debouncedSearchTerm) return performanceData;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return performanceData.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.specialty?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower),
    );
  }, [performanceData, debouncedSearchTerm]);

  const PhotographerRow = ({
    photographer,
    onOpenModal,
    formatCurrency,
    style,
  }: {
    photographer: Photographer & {
      totalSales: number;
      orderCount: number;
      photoCount: number;
    };
    onOpenModal: (type: ModalType, photographer: Photographer) => void;
    formatCurrency: (amount: number) => string;
    style: React.CSSProperties;
  }) => (
    <div
      // eslint-disable-next-line react/forbid-component-props, react/forbid-dom-props, @typescript-eslint/no-explicit-any
      style={style as any}
      className="flex items-center border-b border-white/5 hover:bg-white/5 transition-colors px-4 min-h-[64px]"
    >
      <div className="w-[30%] flex items-center gap-3 py-2">
        <img
          src={photographer.avatarUrl || "https://i.imgur.com/3Y2j2s2.png"}
          alt={photographer.name}
          className="w-10 h-10 rounded-full object-cover border border-white/10"
        />
        <div>
          <p className="font-bold text-white">{photographer.name}</p>
          <p className="text-xs text-slate-400 font-medium">{photographer.specialty}</p>
        </div>
      </div>
      <div className="w-[15%]">
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold border ${
            photographer.role === "Admin"
              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
              : "bg-sky-500/10 text-sky-400 border-sky-500/20"
          }`}
        >
          {photographer.role}
        </span>
      </div>
      <div className="w-[10%] text-center text-white font-bold font-mono">
        {photographer.orderCount}
      </div>
      <div className="w-[15%] text-center text-white font-bold font-mono">
        {photographer.photoCount.toLocaleString()}
      </div>
      <div className="w-[15%] text-right font-bold text-emerald-400 font-mono">
        {formatCurrency(photographer.totalSales)}
      </div>
      <div className="w-[15%] text-right flex justify-end">
        <button
          onClick={() => onOpenModal("edit", photographer)}
          className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
        >
          Edit
        </button>
      </div>
    </div>
  );

  const PhotographerRowRenderer = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const p = filteredPerformanceData[index];
    if (!p) return null;
    return (
      <PhotographerRow
        style={style}
        photographer={p}
        onOpenModal={openModal}
        formatCurrency={formatCurrency}
      />
    );
  };

  if (isLoadingPhotographers || isLoadingOrders) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Photographers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage team members, track performance, and set objectives
          </p>
        </div>
        {can("managePhotographers") && (
          <button
            onClick={() => {
              setUserToEdit(null);
              setModal("edit");
            }}
            className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Photographer
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard
          title="Total Photographers"
          value={kpiData.totalPhotographers}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015.5-4.93a6.97 6.97 0 00-1.5 4.33A6.97 6.97 0 009 16c0 .34.024.673.07 1H1V6a5 5 0 015-5z" />
            </svg>
          }
        />
        <StatCard
          title="Top Performer"
          value={kpiData.topPerformer}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
        />
        <StatCard
          title="Most Active"
          value={kpiData.mostActive}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm10.5 5.5a1 1 0 00-1-1H5.5a1 1 0 000 2H13a1 1 0 001.5-1.5zm-1 4a1 1 0 00-1-1H5.5a1 1 0 000 2H13a1 1 0 001.5-1.5z"
                clipRule="evenodd"
              />
            </svg>
          }
        />
        <StatCard
          title="Average Sales"
          value={formatCurrency(kpiData.averageSales)}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:max-w-md group flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-sky-400 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search photographers by name, specialty, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all shadow-sm text-white placeholder-slate-500 backdrop-blur-md"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 backdrop-blur-md">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/10 text-sky-400 shadow-sm border border-white/5" : "text-slate-400 hover:text-slate-200"}`}
              title="Grid View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white/10 text-sky-400 shadow-sm border border-white/5" : "text-slate-400 hover:text-slate-200"}`}
              title="List View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        {debouncedSearchTerm && (
          <div className="mt-2 text-sm text-slate-500">
            Found{" "}
            <span className="font-semibold text-slate-700">
              {filteredPerformanceData.length}
            </span>{" "}
            {filteredPerformanceData.length === 1
              ? "photographer"
              : "photographers"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <IncomeByPhotographerChart
            orders={filteredOrders}
            photographers={photographers}
          />
        </div>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Filters</h3>
            {(startDate || endDate || selectedPhotographerId !== "all") && (
              <button
                onClick={resetFilters}
                className="text-xs text-sky-400 hover:underline font-bold"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="photographer-filter"
                className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2"
              >
                Photographer
              </label>
              <select
                id="photographer-filter"
                value={selectedPhotographerId}
                onChange={(e) =>
                  setSelectedPhotographerId(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  )
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all shadow-sm text-white backdrop-blur-md"
              >
                <option value="all" className="bg-[#0f172a]">All Photographers</option>
                {photographers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0f172a]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2"
                >
                  From Date
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all shadow-sm text-white backdrop-blur-md [color-scheme:dark]"
                />
              </div>
              <div>
                <label
                  htmlFor="end-date"
                  className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2"
                >
                  To Date
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all shadow-sm text-white backdrop-blur-md [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {photographers.length > 0 ? (
        filteredPerformanceData.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredPerformanceData.map((p) => (
                <PhotographerPerformanceCard
                  key={p.id}
                  photographer={p}
                  totalSales={p.totalSales}
                  orderCount={p.orderCount}
                  photoCount={p.photoCount}
                  onOpenModal={openModal}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/4 border border-white/8 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col h-[500px]">
              <div className="bg-white/5 border-b border-white/8 font-bold text-[10px] uppercase tracking-widest text-slate-400 flex sticky top-0 z-10 px-4">
                <div className="py-4 w-[30%]">Photographer</div>
                <div className="py-4 w-[15%]">Role</div>
                <div className="py-4 w-[10%] text-center">Orders</div>
                <div className="py-4 w-[15%] text-center">Photos</div>
                <div className="py-4 w-[15%] text-right">Total Sales</div>
                <div className="py-4 w-[15%] text-right">Actions</div>
              </div>
              <div className="flex-grow min-h-0" ref={containerRef}>
                <FixedSizeList
                  height={containerHeight || 400}
                  itemCount={filteredPerformanceData.length}
                  itemSize={64}
                  width="100%"
                  className="custom-scrollbar"
                >
                  {PhotographerRowRenderer}
                </FixedSizeList>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-24 bg-white/4 rounded-3xl border-2 border-dashed border-white/10 backdrop-blur-xl">
            <div className="bg-white/5 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm border border-white/5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
              No Photographers Found
            </h3>
            <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto">
              {debouncedSearchTerm
                ? `No photographers match "${debouncedSearchTerm}". Try adjusting your search.`
                : "No photographers match your current filters."}
            </p>
          </div>
        )
      ) : (
        <div className="text-center py-24 bg-white/4 rounded-3xl border-2 border-dashed border-white/10 backdrop-blur-xl">
          <div className="bg-white/5 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm border border-white/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
            No Photographers Yet
          </h3>
          <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto mb-6">
            Add your first photographer to start tracking team performance and
            managing objectives.
          </p>
          {can("managePhotographers") && (
            <button
              onClick={() => {
                setUserToEdit(null);
                setModal("edit");
              }}
              className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Photographer
            </button>
          )}
        </div>
      )}

      <>
        {selectedPhotographer && (
          <>
            <WorkingTimeModal
              isOpen={modal === "workingTime"}
              onClose={closeModal}
              photographer={selectedPhotographer}
            />
            <ObjectivesModal
              isOpen={modal === "objectives"}
              onClose={closeModal}
              photographer={selectedPhotographer}
              onSave={handleSaveObjective}
            />
            <ConnexionHistoryModal
              isOpen={modal === "history"}
              onClose={closeModal}
              photographer={selectedPhotographer}
            />
          </>
        )}
        <UserEditModal
          isOpen={modal === "edit"}
          onClose={closeModal}
          onDataChange={refreshData}
          userToEdit={userToEdit}
          availableRoles={[
            "Admin",
            "Manager",
            "Team Leader",
            "CEO",
            "Photographer",
          ]}
        />
      </>
    </div>
  );
};

export default Photographers;
