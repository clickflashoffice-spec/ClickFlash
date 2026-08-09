
import React, { useState, useEffect } from 'react';
import { Card } from "@clickflash/ui";
import { Spinner } from "@clickflash/ui";
import { Plus, Trash2, Edit2, Image as ImageIcon, X, Check } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { logger } from '../../../utils/logger';

interface PortfolioItem {
    id: string;
    title: string;
    category: string;
    description: string;
    image_url: string;
    featured: boolean;
    sort_order: number;
}

const PortfolioManager: React.FC = () => {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        category: 'Wedding',
        description: '',
        image_url: '',
        featured: false,
        sort_order: 0
    });

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await apiService.getPortfolioItems();
            setItems(data);
        } catch (error) {
            logger.error('Failed to fetch portfolio items', error as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleOpenModal = (item?: PortfolioItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                category: item.category,
                description: item.description,
                image_url: item.image_url,
                featured: item.featured,
                sort_order: item.sort_order
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                category: 'Wedding',
                description: '',
                image_url: '',
                featured: false,
                sort_order: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingItem) {
                await apiService.updatePortfolioItem(editingItem.id, formData);
            } else {
                await apiService.createPortfolioItem(formData);
            }
            await fetchItems(); // Refresh list
            handleCloseModal();
        } catch (error) {
            logger.error('Failed to save portfolio item', error as Error);
            alert('Failed to save item. Please check the logs.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await apiService.deletePortfolioItem(id);
            setItems(items.filter(item => item.id !== id));
        } catch (error) {
            logger.error('Failed to delete portfolio item', error as Error);
            alert('Failed to delete item.');
        }
    };

    if (loading) return <div className="p-8"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Portfolio Gallery</h3>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(item => (
                    <Card key={item.id} className="relative group overflow-hidden border border-slate-100 hover:shadow-lg transition-all">
                        <div className="aspect-video bg-slate-100 rounded-lg mb-4 overflow-hidden relative">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-300">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                            )}
                            {item.featured && (
                                <div className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                    Featured
                                </div>
                            )}
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">{item.category}</p>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4">{item.description}</p>

                        <div className="flex justify-end gap-2 mt-auto">
                            <button
                                onClick={() => handleOpenModal(item)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-cyan-500 transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </Card>
                ))}

                {items.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">No portfolio items found.</p>
                        <button onClick={() => handleOpenModal()} className="mt-2 text-cyan-500 hover:underline text-xs font-bold uppercase tracking-wider">Create the first one</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                                {editingItem ? 'Edit Item' : 'New Portfolio Item'}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close Modal">
                                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                    placeholder="e.g. Sunset Wedding"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all cursor-pointer"
                                    >
                                        <option value="Wedding">Wedding</option>
                                        <option value="Event">Event</option>
                                        <option value="Resort">Resort</option>
                                        <option value="Portrait">Portrait</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort Order</label>
                                    <input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image URL</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                    placeholder="https://..."
                                />
                                {formData.image_url && (
                                    <div className="mt-2 text-xs text-slate-400 truncate max-w-full">
                                        Preview: <a href={formData.image_url} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline">Link</a>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all resize-none min-h-[80px]"
                                    placeholder="Short description..."
                                />
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="featured"
                                    checked={formData.featured}
                                    onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                                />
                                <label htmlFor="featured" className="text-sm font-bold text-slate-700 cursor-pointer select-none">Mark as Featured</label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-cyan-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Spinner size="small" color="white" /> : <Check className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioManager;
