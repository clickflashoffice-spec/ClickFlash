import React, { useState } from 'react';
import { useSystemSetting } from "../../../hooks/useSystemSetting";
import { Tag, Plus, Trash2, Edit2, Check, X, RefreshCw } from "lucide-react";

interface PhotoCategory {
  id: string;
  name: string;
  description?: string;
}

const DEFAULT_CATEGORIES: PhotoCategory[] = [
  { id: "beach", name: "Beach" },
  { id: "pool", name: "Pool" },
  { id: "session", name: "Private Session" },
  { id: "action", name: "Action" },
];

const PhotoCategorySettings: React.FC = () => {
  const {
    value: categories,
    update: setCategories,
    isLoading,
  } = useSystemSetting<PhotoCategory[]>("photoCategories", DEFAULT_CATEGORIES);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newCategory: PhotoCategory = {
      id: newName.toLowerCase().replace(/\s+/g, "_"),
      name: newName.trim(),
    };
    setCategories([...categories, newCategory]);
    setNewName("");
    setIsAdding(false);
  };

  const handleStartEdit = (cat: PhotoCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = (id: string) => {
    setCategories(
      categories.map((c) => (c.id === id ? { ...c, name: editName } : c)),
    );
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-cyan-600" />
            Photo <span className="text-cyan-600">Categories</span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Define categories for album and photo organization.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Category
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isAdding && (
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-2xl p-4 shadow-sm animate-in fade-in zoom-in">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                autoFocus
                placeholder="Category Name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  aria-label="Cancel"
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
          >
            {editingId === cat.id ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(cat.id)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(cat.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 group-hover:text-cyan-600 transition-colors">
                    <Tag className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {cat.name}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    aria-label="Edit category"
                    className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    aria-label="Delete category"
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoCategorySettings;
