import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import Spinner from '../common/Spinner';
import {Plus, Edit, Trash2, Camera, Tag} from 'lucide-react';

interface Equipment {
    id: string;
    name: string;
    type: string; // This refers to category label or ID
    status: 'Available' | 'In Use' | 'Maintenance' | 'Lost';
    assignedToPhotographerId?: string;
    destinationId?: string;
    updated: string;
}

interface EquipmentCategory {
    id: string;
    label: string;
}

export default function EquipmentPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Equipment | null>(null);
    const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null);

    // Fetch Data
    const { data: equipment, isLoading: loadingEquip } = useQuery({
        queryKey: ['equipment'],
        queryFn: async () => {
            const res = await apiService.getCollection('equipment');
            return res.items as unknown as Equipment[];
        }
    });

    const { data: categories, isLoading: loadingCats } = useQuery({
        queryKey: ['equipment_categories'],
        queryFn: async () => {
            const res = await apiService.getCollection('equipment_categories');
            return res.items as unknown as EquipmentCategory[];
        }
    });

    // Mutations (Generic wrapper could be better but keeping it simple)
    const createEquipMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => apiService.createRecord('equipment', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment'] }); setIsModalOpen(false); }
    });
    const updateEquipMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiService.updateRecord('equipment', id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment'] }); setEditingItem(null); }
    });
    const deleteEquipMutation = useMutation({
        mutationFn: (id: string) => apiService.deleteRecord('equipment', id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] })
    });

    const createCatMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => apiService.createRecord('equipment_categories', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment_categories'] }); setIsModalOpen(false); }
    });
    const updateCatMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiService.updateRecord('equipment_categories', id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment_categories'] }); setEditingCategory(null); }
    });
    const deleteCatMutation = useMutation({
        mutationFn: (id: string) => apiService.deleteRecord('equipment_categories', id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment_categories'] })
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        if (activeTab === 'items') {
            const data = {
                name: formData.get('name'),
                type: formData.get('type'),
                status: formData.get('status'),
            };
            if (editingItem) updateEquipMutation.mutate({ id: editingItem.id, data });
            else createEquipMutation.mutate(data);
        } else {
            const data = { label: formData.get('label') };
            if (editingCategory) updateCatMutation.mutate({ id: editingCategory.id, data });
            else createCatMutation.mutate(data);
        }
    };

    if (loadingEquip || loadingCats) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Camera className="w-6 h-6 text-cyan-500" />
                            Equipment Tracker
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Manage cameras, lenses, and hardware</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm shadow-cyan-200"
                    >
                        <Plus className="w-4 h-4" />
                        Add {activeTab === 'items' ? 'Equipment' : 'Category'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'items' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        All Equipment
                    </button>
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Categories
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-grow overflow-auto p-6">
                {activeTab === 'items' && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {equipment?.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                                                <Tag className="w-3 h-3" />
                                                {categories?.find(c => c.id === item.type)?.label || item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${item.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                item.status === 'In Use' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-red-50 text-red-600 border-red-100'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingItem(item)} className="text-cyan-600 hover:text-cyan-700 font-medium px-3 text-xs">Edit</button>
                                            <button onClick={() => { if (confirm('Delete?')) deleteEquipMutation.mutate(item.id) }} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {equipment?.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No equipment found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categories?.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-cyan-200 hover:shadow-md transition-all group">
                                <span className="font-medium text-slate-700">{cat.label}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingCategory(cat)} title="Edit Category" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-cyan-600"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => { if (confirm('Delete?')) deleteCatMutation.mutate(cat.id) }} title="Delete Category" className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {(isModalOpen || editingItem || editingCategory) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <h2 className="text-xl font-bold mb-4">
                                {activeTab === 'items'
                                    ? (editingItem ? 'Edit Equipment' : 'Add Equipment')
                                    : (editingCategory ? 'Edit Category' : 'Add Category')}
                            </h2>

                            {activeTab === 'items' && (
                                <>
                                    <input name="name" defaultValue={editingItem?.name} required placeholder="Equipment Name" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                    <select name="type" defaultValue={editingItem?.type} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        {categories?.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        <option value="Uncategorized">Uncategorized</option>
                                    </select>
                                    <select name="status" defaultValue={editingItem?.status || 'Available'} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="Available">Available</option>
                                        <option value="In Use">In Use</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </>
                            )}

                            {activeTab === 'categories' && (
                                <input name="label" defaultValue={editingCategory?.label} required placeholder="Category Label" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingItem(null); setEditingCategory(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
