import React, { useState, useEffect, useMemo } from "react";
import Card from "../common/Card.tsx";
import {
  Equipment,
  Photographer,
  EquipmentStatus,
  EquipmentCategory,
  Destination,
} from "../../types.ts";
import { apiService } from "../../services/apiService.ts";
import Spinner from "../common/Spinner.tsx";
import StatCard from "../common/StatCard.tsx";
import AddEquipmentModal from "./modals/AddEquipmentModal.tsx";

const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "Available",
  "In Use",
  "In Storage",
  "Needs Repair",
];

interface WarehousePageProps {
  context?: string;
}

const WarehousePage: React.FC<WarehousePageProps> = ({ context }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<
    EquipmentCategory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(
    null,
  );
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"equipment" | "inventory">(
    "equipment",
  );

  // Filters
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [destinationFilter, setDestinationFilter] = useState(context || "All");

  useEffect(() => {
    if (context) {
      setDestinationFilter(context);
    }
  }, [context]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        equipmentData,
        photographerData,
        destinationData,
        categoryData,
        inventoryData,
      ] = await Promise.all([
        apiService.getEquipment(),
        apiService.getUsers(),
        apiService.getDestinations(),
        apiService.getEquipmentCategories(),
        apiService.getInventory(),
      ]);
      setEquipment(equipmentData);
      setPhotographers(photographerData);
      setDestinations(destinationData);
      setEquipmentCategories(categoryData);
      setInventory(inventoryData);
    } catch (error) {
      console.error("Failed to fetch warehouse data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      if (typeFilter !== "All" && item.type !== typeFilter) return false;
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (
        destinationFilter !== "All" &&
        item.destinationId !== destinationFilter
      )
        return false;
      return true;
    });
  }, [equipment, typeFilter, statusFilter, destinationFilter]);

  const kpiData = useMemo(() => {
    return {
      total: filteredEquipment.length,
      inUse: filteredEquipment.filter((e) => e.status === "In Use").length,
      available: filteredEquipment.filter((e) => e.status === "Available")
        .length,
      needsRepair: filteredEquipment.filter((e) => e.status === "Needs Repair")
        .length,
    };
  }, [filteredEquipment]);

  const handleSaveEquipment = async (
    item: Omit<Equipment, "id"> | Equipment,
  ) => {
    if ("id" in item) {
      await apiService.updateEquipment(item.id, item);
    } else {
      await apiService.createEquipment(item);
    }
    setIsModalOpen(false);
    setEquipmentToEdit(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this equipment?")) {
      await apiService.deleteEquipment(id);
      fetchData();
    }
  };

  const openModal = (item: Equipment | null) => {
    setEquipmentToEdit(item);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setTypeFilter("All");
    setStatusFilter("All");
    setDestinationFilter("All");
  };

  if (loading) return <Spinner />;

  const getStatusColor = (status: EquipmentStatus) => {
    switch (status) {
      case "In Use":
        return "bg-blue-500/20 text-blue-400";
      case "Available":
        return "bg-green-500/20 text-green-400";
      case "In Storage":
        return "bg-slate-500/20 text-slate-400";
      case "Needs Repair":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Warehouse &amp; Equipment</h1>
          <div className="flex mt-4 gap-1.5 p-1 bg-white/5 border border-white/8 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("equipment")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === "equipment" ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            >
              Equipment
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === "inventory" ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            >
              Consumables
            </button>
          </div>
        </div>
        {activeTab === "equipment" ? (
          <button
            onClick={() => openModal(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
          >
            Add Equipment
          </button>
        ) : (
          <button
            onClick={async () => {
              const name = prompt("Enter item name (e.g. Standard Ribbon):");
              if (!name) return;
              const type = prompt("Enter type (Ribbon/Paper):", "Ribbon");
              if (!type) return;
              const count = prompt("Initial count:", "500");
              if (count === null) return;
              await apiService.createInventoryItem({
                name,
                type,
                current_count: parseInt(count),
                low_stock_threshold: 50,
              });
              fetchData();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all text-xs font-black uppercase tracking-wider"
          >
            New Consumable
          </button>
        )}
      </div>

      {activeTab === "equipment" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Items"
              value={kpiData.total.toLocaleString()}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              }
            />
            <StatCard
              title="Items in Use"
              value={kpiData.inUse.toLocaleString()}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            <StatCard
              title="Available Items"
              value={kpiData.available.toLocaleString()}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
            <StatCard
              title="Needs Repair"
              value={kpiData.needsRepair.toLocaleString()}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            />
          </div>

          <div className="p-4 bg-white/4 rounded-2xl border border-white/8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                >
                  <option value="All">All Types</option>
                  {equipmentCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                >
                  <option value="All">All Statuses</option>
                  {EQUIPMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Destination</label>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                >
                  <option value="All">All Destinations</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={resetFilters}
                className="py-2.5 px-3 bg-white/5 border border-white/8 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-all"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="bg-white/4 rounded-2xl border border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((item) => {
                    const photographer = photographers.find((p) => p.id === item.assignedToPhotographerId);
                    const destination = destinations.find((d) => d.id === item.destinationId);
                    const category = equipmentCategories.find((c) => c.id === item.type);
                    return (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                        <td className="p-4 font-semibold text-white text-sm">{item.name}</td>
                        <td className="p-4 text-slate-400 text-sm">{category?.label || item.type}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-sm">{photographer?.name || <span className="text-slate-600">—</span>}</td>
                        <td className="p-4 text-slate-400 text-sm">{destination?.name || <span className="text-slate-600">Company-wide</span>}</td>
                        <td className="p-4 space-x-3">
                          <button onClick={() => openModal(item)} className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors">Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="text-rose-400 hover:text-rose-300 text-xs font-bold transition-colors">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white/4 rounded-2xl border border-white/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                <tr>
                  <th className="p-4">Consumable</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Threshold</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/4 transition-colors">
                    <td className="p-4 font-semibold text-white text-sm">{item.name}</td>
                    <td className="p-4 text-slate-400 text-sm">{item.type}</td>
                    <td className="p-4">
                      <span className={`font-mono text-lg font-black ${item.current_count <= item.low_stock_threshold ? "text-rose-400" : "text-white"}`}>
                        {item.current_count}
                      </span>
                      <span className="text-xs text-slate-600 ml-1">prints</span>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">{item.low_stock_threshold}</td>
                    <td className="p-4">
                      {item.current_count <= item.low_stock_threshold ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-400/10 text-rose-400 border border-rose-400/20">Low Stock</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">Healthy</span>
                      )}
                    </td>
                    <td className="p-4 space-x-3">
                      <button
                        onClick={async () => {
                          const add = prompt(`Add prints to ${item.name}:`, "500");
                          if (!add) return;
                          await apiService.updateInventoryItem(item.id, { current_count: item.current_count + parseInt(add) });
                          fetchData();
                        }}
                        className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                      >
                        Refill
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("Delete this consumable?")) {
                            await apiService.deleteInventoryItem(item.id);
                            fetchData();
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-600 italic text-sm">
                      No consumables found. Add a ribbon or paper stock to begin tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "equipment" && (
        <AddEquipmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEquipmentToEdit(null);
          }}
          onSave={handleSaveEquipment}
          equipmentToEdit={equipmentToEdit}
          photographers={photographers}
          equipmentCategories={equipmentCategories}
        />
      )}
    </div>
  );
};

export default WarehousePage;

