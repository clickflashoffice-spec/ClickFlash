import React, { useState, useEffect, useMemo, useRef } from "react";
import { Order, Photographer } from "../types.ts";
import OrderEditModal from "./modals/OrderEditModal.tsx";
import { useCurrency } from "./CurrencyContext.tsx";
import { usePermissions } from "../hooks/usePermissions.ts";
import Card from "./common/Card.tsx";
import OrdersBoard from "./orders/OrdersBoard.tsx";
import { useDebounce } from "../hooks/useDebounce.ts";
import { OrderCardSkeleton, ListItemSkeleton } from "./common/Skeleton.tsx";
import { useOrders, useUpdateOrder } from "../hooks/useOrders.ts";
import { usePhotographers } from "../hooks/usePhotographers.ts";
import { FixedSizeList as List } from "react-window";

/**
 * Orders Component Props
 */
interface OrdersProps {
  /** Function to show toast notifications */
  showToast: (message: string) => void;
  /** Current logged-in user */
  currentUser: Photographer;
  /** Callback to print order */
  onPrintOrder: (order: Order) => void;
  /** Callback to print receipt */
  onPrintReceipt: (order: Order) => void;
  /** Callback to open lab folder */
  onOpenLabFolder: (order: Order) => void;
}

import StatCard from "./common/StatCard.tsx";

/**
 * Orders Component
 *
 * Main component for viewing and managing orders in the Master Portal.
 * Refactored for ClickFlash Light Theme (No Dark Mode).
 */
const Orders: React.FC<OrdersProps> = ({
  showToast,
  currentUser,
  onPrintOrder,
  onPrintReceipt,
  onOpenLabFolder,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<"All" | Order["status"]>(
    "All",
  );
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const { can } = usePermissions(currentUser);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // React Query hooks
  const { data: ordersData = [], isLoading, error: queryError } = useOrders();
  const { data: photographers = [] } = usePhotographers();
  const updateOrderMutation = useUpdateOrder();

  // Sort orders by date (newest first)
  const allOrders = useMemo(() => {
    return [...ordersData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [ordersData]);

  const error = queryError ? "Failed to fetch orders." : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleOrders = useMemo(() => {
    if (can("viewAllOrders")) {
      return allOrders;
    }
    return allOrders.filter((order) => order.photographerId === currentUser.id);
  }, [allOrders, currentUser, can]);

  const filteredOrders = useMemo(() => {
    return visibleOrders.filter((order) => {
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch =
          order.id.toLowerCase().includes(searchLower) ||
          order.clientName.toLowerCase().includes(searchLower) ||
          (order.email && order.email.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      const matchesFilter =
        statusFilter === "All" || order.status === statusFilter;
      return matchesFilter;
    });
  }, [visibleOrders, debouncedSearchTerm, statusFilter]);

  const kpiData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      totalRevenue: filteredOrders
        .filter((o) => o.status === "Completed")
        .reduce((sum, o) => sum + o.total, 0),
      pendingOrders: filteredOrders.filter((o) => o.status === "Pending")
        .length,
      completedToday: filteredOrders.filter(
        (o) => o.status === "Completed" && o.date === today,
      ).length,
      needsDelivery: filteredOrders.filter((o) => o.status === "Completed")
        .length,
    };
  }, [filteredOrders]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    try {
      await updateOrderMutation.mutateAsync({
        id: updatedOrder.id,
        data: updatedOrder,
      });
      setSelectedOrder(null);
      showToast(`Order ${updatedOrder.id} has been updated.`);
    } catch (err) {
      showToast(`Error: Failed to update order.`);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: Order["status"],
  ) => {
    setOpenActionMenu(null);
    try {
      await updateOrderMutation.mutateAsync({
        id: orderId,
        data: { status: newStatus },
      });
      showToast(`Order ${orderId} marked as ${newStatus}.`);
    } catch (error) {
      showToast("Error updating order status.");
    }
  };

  const filterOptions: Array<"All" | Order["status"]> = [
    "All",
    "Pending",
    "Completed",
    "Delivered",
    "Cancelled",
  ];

  // Dynamic sizing for virtual list
  useEffect(() => {
    if (!containerRef.current || viewMode !== "list") return;

    const updateHeight = () => {
      if (containerRef.current) {
        // Header is roughly 50px, but it's flex, so we measure the list container
        const parent = containerRef.current.querySelector(".flex-grow");
        if (parent) {
          setContainerHeight(parent.clientHeight - 50); // Subtract header approx height
        }
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(containerRef.current);
    updateHeight();

    return () => observer.disconnect();
  }, [viewMode, isLoading]);

  // Row renderer for virtualization
  const OrderRow = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const order = filteredOrders[index];
    if (!order) return null;

    const photographer = photographers.find(
      (p) => p.id === order.photographerId,
    );

    return (
      // eslint-disable-next-line react/forbid-component-props, react/forbid-dom-props, @typescript-eslint/no-explicit-any
      <div
        style={style as any}
        className="flex border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
        onClick={() => setSelectedOrder(order)}
      >
        {/* ID Column */}
        <div className="p-4 w-[120px] shrink-0">
          <p className="font-mono font-bold text-sm text-white">
            {order.id}
          </p>
          <p className="text-xs text-slate-400 whitespace-nowrap">
            {new Date(order.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Client Column */}
        <div className="p-4 flex-grow overflow-hidden">
          <p className="font-bold text-sm text-white truncate">
            {order.clientName || "N/A"}
          </p>
          {order.email && (
            <p className="text-xs text-slate-400 truncate" title={order.email}>
              {order.email}
            </p>
          )}
        </div>

        {/* Photographer Column */}
        <div className="p-4 w-[180px] shrink-0 hidden md:flex items-center">
          {photographer ? (
            <div className="flex items-center space-x-2">
              <img
                src={
                  photographer.avatarUrl || "https://i.imgur.com/3Y2j2s2.png"
                }
                alt={photographer.name}
                className="w-8 h-8 rounded-full object-cover border border-white/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://i.imgur.com/3Y2j2s2.png";
                }}
              />
              <span className="text-sm text-slate-300 font-medium truncate">
                {photographer.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-sm italic">Unassigned</span>
          )}
        </div>

        {/* Status Column */}
        <div className="p-4 w-[120px] shrink-0 flex items-center">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1.5 border ${
              order.status === "Completed"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : order.status === "Delivered"
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : order.status === "Pending"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {order.status === "Pending" && (
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse shadow-[0_0_8px_currentColor]"></span>
            )}
            {order.status}
          </span>
        </div>

        {/* Total Column */}
        <div className="p-4 w-[100px] shrink-0 text-right font-bold font-mono text-white flex items-center justify-end">
          {formatCurrency(order.total)}
        </div>

        {/* Actions Column */}
        <div
          className="p-4 w-[140px] shrink-0 text-center relative flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLabFolder(order);
              }}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors border border-white/10 shadow-sm"
              title="Lab Folder"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenActionMenu(
                  openActionMenu === order.id ? null : order.id,
                );
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
              title="View Order Details"
              aria-label="View Order Details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          {openActionMenu === order.id && (
            <div
              ref={actionMenuRef}
              className="absolute right-12 top-0 z-50 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl text-left overflow-hidden ring-1 ring-black/50 animate-in zoom-in-95 duration-200 origin-top-right backdrop-blur-xl"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrder(order);
                  setOpenActionMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 text-slate-300 transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Details
              </button>
              {order.status === "Pending" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(order.id, "Completed");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 text-slate-300 transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Complete
                </button>
              )}
              {order.status === "Completed" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(order.id, "Delivered");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 text-slate-300 transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Deliver
                </button>
              )}
              <div className="my-1 h-px bg-white/10"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrintOrder(order);
                  setOpenActionMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 text-slate-300 transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Worksheet
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrintReceipt(order);
                  setOpenActionMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 text-slate-300 transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Receipt
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="bg-red-500/10 rounded-full p-4 mb-4 border border-red-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Error Loading Orders
        </h3>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="text-white h-full flex flex-col animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage customer orders, track status, and process deliveries
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex space-x-1 shadow-inner backdrop-blur-md">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === "list" ? "bg-white/10 shadow-sm text-sky-400 border border-white/5" : "text-slate-400 hover:text-slate-200"}`}
            title="List View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === "board" ? "bg-white/10 shadow-sm text-sky-400 border border-white/5" : "text-slate-400 hover:text-slate-200"}`}
            title="Board View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <span className="hidden sm:inline">Board</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 flex-shrink-0">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(kpiData.totalRevenue)}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"
              />
            </svg>
          }
          colorClass="border-sky-500/20"
        />
        <StatCard
          title="Pending Orders"
          value={kpiData.pendingOrders}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          colorClass="border-amber-500/20"
        />
        <StatCard
          title="Completed Today"
          value={kpiData.completedToday}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          colorClass="border-emerald-500/20"
        />
        <StatCard
          title="Ready for Delivery"
          value={kpiData.needsDelivery}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          colorClass="border-indigo-500/20"
        />
      </div>

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-shrink-0">
        <div className="relative w-full md:max-w-sm group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-cyan-600 transition-colors">
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
            placeholder="Search by ID, client, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all shadow-sm text-white placeholder-slate-500 backdrop-blur-md"
          />
        </div>
        {viewMode === "list" && (
          <div className="flex items-center space-x-1 bg-white/5 border border-white/10 p-1 rounded-lg overflow-x-auto max-w-full shadow-inner backdrop-blur-md">
            {filterOptions.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? "bg-white/10 shadow-sm text-sky-400 border border-white/5"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow overflow-hidden" ref={containerRef}>
        {isLoading ? (
          viewMode === "board" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <OrderCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="bg-white/4 border border-white/8 rounded-xl h-full overflow-hidden shadow-sm backdrop-blur-xl">
              <div className="divide-y divide-white/5">
                {[...Array(8)].map((_, i) => (
                  <ListItemSkeleton key={i} />
                ))}
              </div>
            </div>
          )
        ) : viewMode === "board" ? (
          <OrdersBoard
            orders={filteredOrders}
            onUpdateStatus={handleStatusChange}
            onOrderClick={setSelectedOrder}
          />
        ) : (
          <div className="bg-white/4 border border-white/8 backdrop-blur-xl rounded-xl h-full flex flex-col shadow-sm overflow-hidden">
            {/* Table Header - Fixed */}
            <div className="border-b border-white/8 bg-white/5 backdrop-blur-md flex sticky top-0 z-10 font-bold text-xs uppercase tracking-widest text-slate-400">
              <div className="p-4 w-[120px] shrink-0">Order ID</div>
              <div className="p-4 flex-grow">Client</div>
              <div className="p-4 w-[180px] shrink-0 hidden md:block">
                Photographer
              </div>
              <div className="p-4 w-[120px] shrink-0">Status</div>
              <div className="p-4 w-[100px] shrink-0 text-right">Total</div>
              <div className="p-4 w-[140px] shrink-0 text-center">Actions</div>
            </div>

            {/* List Container */}
            <div className="flex-grow">
              {filteredOrders.length > 0 ? (
                <List
                  height={containerHeight || 500}
                  itemCount={filteredOrders.length}
                  itemSize={80}
                  width="100%"
                  className="custom-scrollbar"
                >
                  {OrderRow}
                </List>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <div className="bg-white/5 border border-white/10 rounded-full p-6 w-20 h-20 mb-4 flex items-center justify-center backdrop-blur-md">
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
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 00-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    {debouncedSearchTerm
                      ? "No Orders Found"
                      : statusFilter !== "All"
                        ? `No ${statusFilter} Orders`
                        : "No Orders Yet"}
                  </h3>
                  <p className="text-sm max-w-sm mx-auto text-center px-4 font-medium">
                    {debouncedSearchTerm
                      ? `No orders match "${debouncedSearchTerm}". Try adjusting your search.`
                      : statusFilter !== "All"
                        ? `There are no ${statusFilter.toLowerCase()} orders at the moment.`
                        : "Orders will appear here once they are created."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {selectedOrder && (
        <OrderEditModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onSave={handleUpdateOrder}
          showToast={showToast}
          onPrintOrder={onPrintOrder}
          onPrintReceipt={onPrintReceipt}
        />
      )}
    </div>
  );
};

export default Orders;
