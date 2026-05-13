import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDebounce } from "../hooks/useDebounce.ts";
import { Order, Photographer } from "../types.ts";
import { apiService } from "../services/apiService.ts";
import Spinner from "./common/Spinner.tsx";
import Card from "./common/Card.tsx";
import { useCurrency } from "./CurrencyContext.tsx";
import ClientDetailsModal from "./modals/ClientDetailsModal.tsx";
import { usePermissions } from "../hooks/usePermissions.ts";
import { FixedSizeList as List } from "react-window";
import { useOrders } from "../hooks/useOrders.ts";

interface Client {
  email: string;
  name: string;
  orders: Order[];
  totalSpent: number;
  lastVisit: string;
}

interface ClientsProps {
  currentUser?: Photographer;
}

/**
 * StatCard Component
 *
 * Displays a statistic card with icon, title, and value.
 * Used in the Clients page to show key metrics.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Statistic title/label
 * @param {string} props.value - Statistic value to display
 * @param {React.ReactNode} props.icon - Icon component to display
 * @param {string} [props.colorClass] - Optional color class for the icon background
 */
import StatCard from "./common/StatCard.tsx";

type SortOption = "name" | "totalSpent" | "lastVisit" | "orderCount";

/**
 * Clients Component
 *
 * Displays client information aggregated from orders.
 * Refactored for ClickFlash Light Theme (No Dark Mode).
 *
 * Features:
 * - Client aggregation from order data
 * - Search and filtering
 * - Sorting by name, total spent, last visit, or order count
 * - Permission-based filtering (photographers see only their clients)
 * - Client details modal
 * - Performance optimized with useMemo for filtering/sorting
 */
const Clients: React.FC<ClientsProps> = ({ currentUser }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { formatCurrency } = useCurrency();
  const { can } = usePermissions(currentUser || null);

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [sortBy, setSortBy] = useState<SortOption>("lastVisit");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Virtualization refs/state
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // React Query hook
  const {
    data: orders = [],
    isLoading: loading,
    error: queryError,
  } = useOrders();
  const error = queryError ? "Failed to fetch clients data." : null;

  const clients = useMemo(() => {
    // Filter orders based on permissions
    let visibleOrders = orders;
    if (currentUser && !can("viewAllOrders")) {
      visibleOrders = orders.filter((o) => o.photographerId === currentUser.id);
    }

    const clientsMap = new Map<string, Client>();

    visibleOrders.forEach((order) => {
      if (!order.email) return; // Skip anonymous orders if any
      const email = order.email.toLowerCase();

      if (!clientsMap.has(email)) {
        clientsMap.set(email, {
          email: order.email,
          name: order.clientName,
          orders: [],
          totalSpent: 0,
          lastVisit: "",
        });
      }

      const client = clientsMap.get(email)!;
      client.orders.push(order);
      if (order.status === "Completed" || order.status === "Delivered") {
        client.totalSpent += order.total;
      }

      // Keep latest name and visit date
      if (
        !client.lastVisit ||
        new Date(order.date) > new Date(client.lastVisit)
      ) {
        client.lastVisit = order.date;
        client.name = order.clientName; // Update to latest name used
      }
    });

    return Array.from(clientsMap.values());
  }, [orders, currentUser, can]);

  const filteredAndSortedClients = useMemo(() => {
    let result = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    );

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalSpent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "lastVisit":
          comparison =
            new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();
          break;
        case "orderCount":
          comparison = a.orders.length - b.orders.length;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clients, debouncedSearchTerm, sortBy, sortDirection]);

  const kpiData = useMemo(() => {
    const totalClients = clients.length;
    const returningClients = clients.filter((c) => c.orders.length > 1).length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgValue = totalClients > 0 ? totalRevenue / totalClients : 0;
    const vipClients = clients.filter((c) => c.orders.length >= 5).length;

    return { totalClients, returningClients, avgValue, vipClients };
  }, [clients]);

  // Resize observer for virtualization
  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (containerRef.current) {
        // Approximate height calculation - subtract headers and KPI cards
        // Or just measure the available flex space
        const parent = containerRef.current.parentElement;
        if (parent) {
          // We'll use a FixedSizeList inside a container that has a defined flex-grow
          // So we must measure that container
          setContainerHeight(containerRef.current.clientHeight);
        }
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(containerRef.current);
    updateHeight();
    return () => observer.disconnect();
  }, []);

  const ClientRow = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const client = filteredAndSortedClients[index];
    if (!client) return null;

    return (
      <div
        className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer items-center min-h-[64px]"
        onClick={() => setSelectedClient(client)}
      >
        <div className="p-4 w-[25%] shrink-0 font-bold text-slate-900 truncate">
          {client.name || "N/A"}
        </div>
        <div className="p-4 w-[25%] shrink-0 text-slate-600 truncate">
          {client.email}
        </div>
        <div className="p-4 w-[15%] shrink-0 text-center flex items-center justify-center">
          {client.orders.length >= 5 ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              VIP
            </span>
          ) : client.orders.length > 1 ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
              Returning
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              New
            </span>
          )}
        </div>
        <div className="p-4 w-[10%] shrink-0 text-right font-mono font-medium items-center flex justify-end">
          {client.orders.length}
        </div>
        <div className="p-4 w-[15%] shrink-0 text-right font-mono font-semibold text-green-600 items-center flex justify-end">
          {formatCurrency(client.totalSpent)}
        </div>
        <div
          className="p-4 w-[10%] shrink-0 text-center items-center flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedClient(client)}
            className="text-cyan-600 hover:text-cyan-800 font-semibold text-xs px-2 py-1 rounded-lg hover:bg-cyan-50 transition-colors"
          >
            History
          </button>
        </div>
      </div>
    );
  };

  const handleSort = (column: SortOption) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="bg-red-50 rounded-full p-4 mb-4 border border-red-100">
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
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Error Loading Clients
        </h3>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Client Relationship Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View client history, track spending, and manage relationships
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Clients"
          value={kpiData.totalClients.toLocaleString()}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Returning"
          value={kpiData.returningClients.toLocaleString()}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          }
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="VIP Clients"
          value={kpiData.vipClients.toLocaleString()}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          }
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Avg. Value"
          value={formatCurrency(kpiData.avgValue)}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"
              />
            </svg>
          }
          colorClass="bg-green-50 text-green-600"
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:max-w-md group">
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
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>
        {debouncedSearchTerm && (
          <div className="text-sm text-slate-500">
            Found{" "}
            <span className="font-semibold text-slate-700">
              {filteredAndSortedClients.length}
            </span>{" "}
            {filteredAndSortedClients.length === 1 ? "client" : "clients"}
          </div>
        )}
      </div>

      <Card className="!p-0 flex-grow overflow-hidden flex flex-col min-h-[400px]">
        <div className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider flex sticky top-0 z-10">
          <div className="p-4 w-[25%] shrink-0">
            <button
              onClick={() => handleSort("name")}
              className="flex items-center gap-2 hover:text-slate-700 transition-colors uppercase"
            >
              Client Name
              {sortBy === "name" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="p-4 w-[25%] shrink-0">Email</div>
          <div className="p-4 w-[15%] shrink-0 text-center">Status</div>
          <div className="p-4 w-[10%] shrink-0 text-right">
            <button
              onClick={() => handleSort("orderCount")}
              className="flex items-center gap-2 hover:text-slate-700 transition-colors ml-auto uppercase"
            >
              Orders
              {sortBy === "orderCount" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="p-4 w-[15%] shrink-0 text-right">
            <button
              onClick={() => handleSort("totalSpent")}
              className="flex items-center gap-2 hover:text-slate-700 transition-colors ml-auto uppercase"
            >
              Spent
              {sortBy === "totalSpent" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="p-4 w-[10%] shrink-0 text-center">Actions</div>
        </div>

        <div className="flex-grow min-h-0" ref={containerRef}>
          {filteredAndSortedClients.length > 0 ? (
            <List
              height={containerHeight || 400}
              itemCount={filteredAndSortedClients.length}
              itemSize={64}
              width="100%"
              className="custom-scrollbar"
            >
              {ClientRow}
            </List>
          ) : (
            <div className="text-center py-24">
              <div className="bg-slate-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-slate-300"
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
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {debouncedSearchTerm
                  ? "No Clients Found"
                  : clients.length === 0
                    ? "No Clients Yet"
                    : "No Matching Clients"}
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto text-center px-4">
                {debouncedSearchTerm
                  ? `No clients match "${debouncedSearchTerm}". Try adjusting your search.`
                  : clients.length === 0
                    ? "Clients will appear here once orders are created."
                    : "No clients match your search criteria."}
              </p>
            </div>
          )}
        </div>
      </Card>

      {selectedClient && (
        <ClientDetailsModal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          client={selectedClient}
        />
      )}
    </div>
  );
};

export default Clients;
