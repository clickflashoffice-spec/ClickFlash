import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Equipment, Photographer, EquipmentStatus, EquipmentCategory, Destination } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import AddEquipmentModal from './modals/AddEquipmentModal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
);

const EQUIPMENT_STATUSES: EquipmentStatus[] = ['Available', 'In Use', 'In Storage', 'Needs Repair'];

const WarehousePage: React.FC = () => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [equipmentCategories, setEquipmentCategories] = useState<EquipmentCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);

    // Filters
    const [typeFilter, setTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [destinationFilter, setDestinationFilter] = useState('All');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [equipmentData, photographerData, destinationData, categoryData] = await Promise.all([
                apiService.getEquipment(),
                apiService.getUsers(),
                apiService.getDestinations(),
                apiService.getEquipmentCategories(),
            ]);
            setEquipment(equipmentData);
            setPhotographers(photographerData);
            setDestinations(destinationData);
            setEquipmentCategories(categoryData);
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
        return equipment.filter(item => {
            if (typeFilter !== 'All' && item.type !== typeFilter) return false;
            if (statusFilter !== 'All' && item.status !== statusFilter) return false;
            if (destinationFilter !== 'All' && item.destinationId !== destinationFilter) return false;
            return true;
        });
    }, [equipment, typeFilter, statusFilter, destinationFilter]);
    
    const kpiData = useMemo(() => {
        return {
            total: filteredEquipment.length,
            inUse: filteredEquipment.filter(e => e.status === 'In Use').length,
            available: filteredEquipment.filter(e => e.status === 'Available').length,
            needsRepair: filteredEquipment.filter(e => e.status === 'Needs Repair').length,
        };
    }, [filteredEquipment]);

    const handleSaveEquipment = async (item: Omit<Equipment, 'id'> | Equipment) => {
        if ('id' in item) {
            await apiService.updateEquipment(item.id, item);
        } else {
            await apiService.createEquipment(item);
        }
        setIsModalOpen(false);
        setEquipmentToEdit(null);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this equipment?')) {
            await apiService.deleteEquipment(id);
            fetchData();
        }
    };

    const openModal = (item: Equipment | null) => {
        setEquipmentToEdit(item);
        setIsModalOpen(true);
    };
    
    const resetFilters = () => {
        setTypeFilter('All');
        setStatusFilter('All');
        setDestinationFilter('All');
    };

    if (loading) return <Spinner />;

    const getStatusColor = (status: EquipmentStatus) => {
        switch (status) {
            case 'In Use': return 'bg-blue-500/20 text-blue-400';
            case 'Available': return 'bg-green-500/20 text-green-400';
            case 'In Storage': return 'bg-slate-500/20 text-slate-400';
            case 'Needs Repair': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Warehouse & Equipment</h1>
                <button
                    onClick={() => openModal(null)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                    Add Equipment
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Items" value={kpiData.total.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>} />
                 <StatCard title="Items in Use" value={kpiData.inUse.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
                 <StatCard title="Available Items" value={kpiData.available.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>} />
                 <StatCard title="Needs Repair" value={kpiData.needsRepair.toLocaleString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} />
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Type</label>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                            <option value="All">All Types</option>
                            {equipmentCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Status</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                            <option value="All">All Statuses</option>
                            {EQUIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-1">Destination</label>
                        <select value={destinationFilter} onChange={e => setDestinationFilter(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2">
                            <option value="All">All Destinations</option>
                            {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <button onClick={resetFilters} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-md text-sm">Reset Filters</button>
                </div>
            </Card>

            <Card className="!p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
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
                                const photographer = photographers.find(p => p.id === item.assignedToPhotographerId);
                                const destination = destinations.find(d => d.id === item.destinationId);
                                const category = equipmentCategories.find(c => c.id === item.type);
                                return (
                                    <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                        <td className="p-4 font-semibold">{item.name}</td>
                                        <td className="p-4">{category?.label || item.type}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-4">{photographer?.name || <span className="text-slate-500">-</span>}</td>
                                        <td className="p-4">{destination?.name || <span className="text-slate-500">Company-wide</span>}</td>
                                        <td className="p-4 space-x-2">
                                            <button onClick={() => openModal(item)} className="text-blue-400 hover:text-blue-300">Edit</button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AddEquipmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEquipmentToEdit(null); }}
                onSave={handleSaveEquipment}
                equipmentToEdit={equipmentToEdit}
                photographers={photographers}
                equipmentCategories={equipmentCategories}
            />
        </div>
    );
};

export default WarehousePage;