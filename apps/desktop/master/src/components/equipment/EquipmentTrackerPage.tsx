import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Modal } from '@clickflash/ui';
import { Search, Plus, Wrench, UserCheck, AlertCircle, CheckCircle2, Clock, Camera, MapPin } from 'lucide-react';
import PageHeader from '../common/PageHeader';
import { useDebounce } from '../../hooks/useDebounce';

type EquipmentCategory = 'Camera' | 'Lens' | 'Lighting' | 'Drone' | 'Accessory';
type EquipmentStatus = 'Available' | 'In Use' | 'Maintenance' | 'Retired';

interface MaintenanceLog {
    id: string;
    date: string;
    issue: string;
    cost: number;
    serviceProvider: string;
}

interface Equipment {
    id: string;
    name: string;
    category: EquipmentCategory;
    serialNumber: string;
    status: EquipmentStatus;
    assignedTo?: string; // Photographer Name
    location?: string;
    purchaseDate: string;
    value: number;
    maintenanceLogs: MaintenanceLog[];
}

const MOCK_EQUIPMENT: Equipment[] = [
    {
        id: 'eq1',
        name: 'Sony A7IV',
        category: 'Camera',
        serialNumber: 'SNY-4893-112',
        status: 'In Use',
        assignedTo: 'Alex M.',
        location: 'Beach Resort Pool',
        purchaseDate: '2025-01-15',
        value: 2499.00,
        maintenanceLogs: []
    },
    {
        id: 'eq2',
        name: 'Sony 24-70mm f/2.8 GM II',
        category: 'Lens',
        serialNumber: 'SNY-L-9982',
        status: 'Available',
        purchaseDate: '2025-02-10',
        value: 2298.00,
        maintenanceLogs: [
            { id: 'ml1', date: '2026-01-05', issue: 'Cleaning and calibration', cost: 150.00, serviceProvider: 'Sony Pro Services' }
        ]
    },
    {
        id: 'eq3',
        name: 'Profoto B10X',
        category: 'Lighting',
        serialNumber: 'PRO-B10-445',
        status: 'Maintenance',
        purchaseDate: '2024-11-20',
        value: 1995.00,
        maintenanceLogs: [
            { id: 'ml2', date: '2026-08-01', issue: 'Flash tube replacement', cost: 250.00, serviceProvider: 'Profoto Repair' }
        ]
    },
    {
        id: 'eq4',
        name: 'DJI Mavic 3 Pro',
        category: 'Drone',
        serialNumber: 'DJI-M3P-777',
        status: 'Retired',
        purchaseDate: '2023-05-15',
        value: 2199.00,
        maintenanceLogs: [
            { id: 'ml3', date: '2026-06-10', issue: 'Water damage', cost: 0, serviceProvider: 'In-house Assessment' }
        ]
    }
];

const StatusBadge: React.FC<{ status: EquipmentStatus }> = ({ status }) => {
    switch (status) {
        case 'Available':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 size={12} /> {status}</span>;
        case 'In Use':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><UserCheck size={12} /> {status}</span>;
        case 'Maintenance':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Wrench size={12} /> {status}</span>;
        case 'Retired':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400"><AlertCircle size={12} /> {status}</span>;
        default:
            return null;
    }
};

export const EquipmentTrackerPage: React.FC = () => {
    const [equipmentList, setEquipmentList] = useState<Equipment[]>(MOCK_EQUIPMENT);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'All'>('All');
    
    // Modals state
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigneeName, setAssigneeName] = useState('');
    
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [newLog, setNewLog] = useState<Partial<MaintenanceLog>>({});

    const filteredEquipment = useMemo(() => {
        const term = debouncedSearch.toLowerCase();
        return equipmentList.filter(eq => {
            const matchesSearch = 
                eq.name.toLowerCase().includes(term) || 
                eq.serialNumber.toLowerCase().includes(term);
            const matchesCategory = categoryFilter === 'All' || eq.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [equipmentList, debouncedSearch, categoryFilter]);

    const handleAssign = () => {
        if (!selectedEquipment) return;
        
        setEquipmentList(list => list.map(eq => {
            if (eq.id === selectedEquipment.id) {
                if (assigneeName.trim() === '') {
                    return { ...eq, status: 'Available', assignedTo: undefined };
                } else {
                    return { ...eq, status: 'In Use', assignedTo: assigneeName };
                }
            }
            return eq;
        }));
        
        setIsAssignModalOpen(false);
        setAssigneeName('');
    };

    const handleAddMaintenance = () => {
        if (!selectedEquipment || !newLog.date || !newLog.issue) return;
        
        const logEntry: MaintenanceLog = {
            id: Math.random().toString(36).substr(2, 9),
            date: newLog.date,
            issue: newLog.issue,
            cost: Number(newLog.cost) || 0,
            serviceProvider: newLog.serviceProvider || 'Internal'
        };

        setEquipmentList(list => list.map(eq => {
            if (eq.id === selectedEquipment.id) {
                return {
                    ...eq,
                    status: 'Maintenance',
                    maintenanceLogs: [...eq.maintenanceLogs, logEntry]
                };
            }
            return eq;
        }));

        setIsMaintenanceModalOpen(false);
        setNewLog({});
    };

    const openAssign = (eq: Equipment) => {
        setSelectedEquipment(eq);
        setAssigneeName(eq.assignedTo || '');
        setIsAssignModalOpen(true);
    };

    const openMaintenance = (eq: Equipment) => {
        setSelectedEquipment(eq);
        setNewLog({ date: new Date().toISOString().split('T')[0] });
        setIsMaintenanceModalOpen(true);
    };

    return (
        <div className="w-full h-full p-6 flex flex-col">
            <PageHeader
                title="Equipment & Asset Management"
                subtitle="Track inventory, assignments, and maintenance logs for all gear."
                actions={
                    <Button variant="primary" className="flex items-center gap-2">
                        <Plus size={16} /> Add Equipment
                    </Button>
                }
            />

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Scan barcode or search by name / serial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
                        {['All', 'Camera', 'Lens', 'Lighting', 'Drone', 'Accessory'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat as any)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    categoryFilter === cat 
                                        ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredEquipment.map(eq => (
                            <Card key={eq.id} className="p-4 flex flex-col h-full border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <StatusBadge status={eq.status} />
                                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{eq.category}</span>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{eq.name}</h3>
                                    <p className="text-sm font-mono text-slate-500">{eq.serialNumber}</p>
                                </div>

                                <div className="space-y-2 mb-4 flex-1">
                                    {eq.assignedTo && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <UserCheck size={14} className="text-blue-500" /> Assigned to: <span className="font-medium">{eq.assignedTo}</span>
                                        </div>
                                    )}
                                    {eq.location && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <MapPin size={14} className="text-red-500" /> Location: {eq.location}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <Clock size={14} className="text-slate-400" /> {eq.maintenanceLogs.length} Maintenance logs
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={() => openAssign(eq)}
                                        disabled={eq.status === 'Retired'}
                                    >
                                        Assign
                                    </Button>
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={() => openMaintenance(eq)}
                                    >
                                        Log
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                    {filteredEquipment.length === 0 && (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                            <Camera size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
                            <p>No equipment found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Assign Equipment Modal */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Equipment">
                {selectedEquipment && (
                    <div className="flex flex-col gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="font-bold">{selectedEquipment.name}</div>
                            <div className="text-sm font-mono text-slate-500">{selectedEquipment.serialNumber}</div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Assign To Photographer</label>
                            <Input 
                                value={assigneeName} 
                                onChange={(e) => setAssigneeName(e.target.value)} 
                                placeholder="E.g. Alex M. (Leave blank to mark Available)"
                            />
                            <p className="text-xs text-slate-500 mt-1">Leaving this blank will return the item to Available status.</p>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAssign}>Save Assignment</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Maintenance Log Modal */}
            <Modal isOpen={isMaintenanceModalOpen} onClose={() => setIsMaintenanceModalOpen(false)} title="Add Maintenance Log">
                {selectedEquipment && (
                    <div className="flex flex-col gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <div className="font-bold">{selectedEquipment.name}</div>
                            <div className="text-sm font-mono text-slate-500">{selectedEquipment.serialNumber}</div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Date</label>
                            <Input 
                                type="date"
                                value={newLog.date || ''} 
                                onChange={(e) => setNewLog({...newLog, date: e.target.value})} 
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Issue / Service Performed</label>
                            <Input 
                                value={newLog.issue || ''} 
                                onChange={(e) => setNewLog({...newLog, issue: e.target.value})} 
                                placeholder="E.g. Sensor cleaning, flash tube replaced"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Cost ($)</label>
                                <Input 
                                    type="number"
                                    value={newLog.cost || ''} 
                                    onChange={(e) => setNewLog({...newLog, cost: Number(e.target.value)})} 
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium">Service Provider</label>
                                <Input 
                                    value={newLog.serviceProvider || ''} 
                                    onChange={(e) => setNewLog({...newLog, serviceProvider: e.target.value})} 
                                    placeholder="E.g. Sony Pro, In-house"
                                />
                            </div>
                        </div>

                        {selectedEquipment.maintenanceLogs.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                                <h4 className="text-sm font-semibold mb-2">Previous Logs</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {selectedEquipment.maintenanceLogs.map(log => (
                                        <div key={log.id} className="p-2 text-sm bg-slate-50 dark:bg-slate-900 rounded flex justify-between">
                                            <div>
                                                <div className="font-medium">{log.issue}</div>
                                                <div className="text-xs text-slate-500">{log.date} • {log.serviceProvider}</div>
                                            </div>
                                            <div className="font-semibold text-slate-700 dark:text-slate-300">${log.cost.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="ghost" onClick={() => setIsMaintenanceModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddMaintenance}>Save & Set to Maintenance</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default EquipmentTrackerPage;
