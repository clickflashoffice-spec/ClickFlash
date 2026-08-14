import React, { useState, useEffect } from "react";
import { EquipmentCategory } from "../../../types";
import { apiService } from "../../../services/apiService";
import { Spinner } from "@clickflash/ui";
import EquipmentCategoryEditModal from "../modals/EquipmentCategoryEditModal";
import { logger } from "@/utils/logger";

const EquipmentCategorySettings: React.FC = () => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] =
    useState<EquipmentCategory | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getEquipmentCategories();
      setCategories(data);
    } catch (error) {
      logger.error("Failed to load equipment categories", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (category: EquipmentCategory | null) => {
    setCategoryToEdit(category);
    setIsModalOpen(true);
  };

  const handleSave = async (
    category: Omit<EquipmentCategory, "id"> | EquipmentCategory,
  ) => {
    if ("id" in category) {
      await apiService.updateEquipmentCategory(category.id, category);
    } else {
      await apiService.createEquipmentCategory(category);
    }
    setIsModalOpen(false);
    setCategoryToEdit(null);
    fetchData();
  };

  const handleDelete = async (id: string, label: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the category "${label}"? This cannot be undone.`,
      )
    ) {
      await apiService.deleteEquipmentCategory(id);
      fetchData();
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
          Equipment <span className="text-cyan-600">Categories</span>
        </h2>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
        >
          Add Category
        </button>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        These categories are used across all destinations for tracking warehouse
        equipment.
      </p>
      <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-2xl">
        <table className="w-full text-left min-w-[500px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <tr>
              <th className="p-4">Label</th>
              <th className="p-4">ID</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr
                key={c.id}
                className="border-b border-slate-200 dark:border-slate-700"
              >
                <td className="p-4 font-semibold text-slate-900 dark:text-white">
                  {c.label}
                </td>
                <td className="p-4 font-mono text-sm text-slate-500 dark:text-slate-400">
                  {c.id}
                </td>
                <td className="p-4 text-center space-x-4">
                  <button
                    onClick={() => handleOpenModal(c)}
                    className="text-cyan-600 hover:text-cyan-500 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.label)}
                    className="text-red-500 hover:text-red-400 font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <EquipmentCategoryEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          categoryToEdit={categoryToEdit}
        />
      )}
    </div>
  );
};

export default EquipmentCategorySettings;
