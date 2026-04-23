import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/apiService";
import Spinner from "../common/Spinner";
import { Plus, Edit, Trash2, AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  current_count: number;
  low_stock_threshold: number;
  updated: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Fetch Inventory
  const {
    data: inventory,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const response = await apiService.getCollection("inventory");
      return response.items as InventoryItem[];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newItem: Omit<InventoryItem, "id" | "updated">) =>
      apiService.createRecord("inventory", newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsAddModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      apiService.updateRecord("inventory", id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteRecord("inventory", id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });

  // Form Handling
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      current_count: Number(formData.get("current_count")),
      low_stock_threshold: Number(formData.get("low_stock_threshold")),
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  if (error)
    return (
      <div className="text-red-500 text-center p-8">
        Error loading inventory
      </div>
    );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-500" />
            Inventory Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track consumables and stock levels
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-cyan-200"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* List */}
      <div className="flex-grow overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory?.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white group"
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${item.current_count <= item.low_stock_threshold ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {item.type}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingItem(item)}
                    title="Edit Item"
                    className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this item?"))
                        deleteMutation.mutate(item.id);
                    }}
                    title="Delete Item"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">
                {item.name}
              </h3>
              <div className="flex items-end gap-2 mt-2">
                <span
                  className={`text-3xl font-black ${item.current_count <= item.low_stock_threshold ? "text-red-500" : "text-slate-700"}`}
                >
                  {item.current_count}
                </span>
                <span className="text-slate-400 text-sm mb-1">in stock</span>
              </div>
              {item.current_count <= item.low_stock_threshold && (
                <div className="mt-3 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-2 py-1.5 rounded-lg border border-red-100">
                  <AlertTriangle className="w-3 h-3" />
                  Low Stock Warning (Threshold: {item.low_stock_threshold})
                </div>
              )}
            </div>
          ))}
          {inventory?.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              No inventory items found. Add your first item above.
            </div>
          )}
        </div>
      </div>

      {/* Modal (Shared for Create/Edit) */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingItem ? "Edit Item" : "Add New Item"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Item Name
                </label>
                <input
                  name="name"
                  defaultValue={editingItem?.name}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g. AA Batteries"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category / Type
                </label>
                <select
                  name="type"
                  defaultValue={editingItem?.type || "Consumable"}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Consumable">Consumable</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Office">Office Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    name="current_count"
                    type="number"
                    defaultValue={editingItem?.current_count ?? 0}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    name="low_stock_threshold"
                    type="number"
                    defaultValue={editingItem?.low_stock_threshold ?? 5}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium shadow-lg shadow-cyan-200"
                >
                  {editingItem ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
