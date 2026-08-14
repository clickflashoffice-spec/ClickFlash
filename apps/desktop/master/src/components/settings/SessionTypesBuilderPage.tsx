import React, { useState } from 'react';
import { Card, Button, Input, Modal } from '@clickflash/ui';
import { Plus, Edit, Trash2, Clock, Image as ImageIcon, DollarSign, Sun, Camera, Check } from 'lucide-react';
import PageHeader from '../common/PageHeader';

interface PriceRule {
    id: string;
    type: 'PeakHour' | 'GroupSize';
    description: string;
    surchargeAmount: number;
    isActive: boolean;
}

interface SessionPackage {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    includedDigitals: number;
    durationMins: number;
    recommendedShotList: string[];
    priceRules: PriceRule[];
    isActive: boolean;
}

const MOCK_PACKAGES: SessionPackage[] = [
    {
        id: 'pkg1',
        name: 'Couple Sunset Experience',
        description: 'Romantic sunset session by the beach. Perfect for couples and engagements.',
        basePrice: 299.00,
        includedDigitals: 15,
        durationMins: 45,
        recommendedShotList: ['Walking on beach', 'Silhouette against sun', 'Close up hands', 'Candid laughing'],
        priceRules: [
            { id: 'pr1', type: 'PeakHour', description: 'Golden Hour Premium (1hr before sunset)', surchargeAmount: 50.00, isActive: true }
        ],
        isActive: true
    },
    {
        id: 'pkg2',
        name: 'Family Resort Memories',
        description: 'Fun, relaxed session around the resort capturing family connections.',
        basePrice: 349.00,
        includedDigitals: 20,
        durationMins: 60,
        recommendedShotList: ['Whole family posed', 'Kids playing', 'Parents only', 'Generational shots'],
        priceRules: [
            { id: 'pr2', type: 'GroupSize', description: 'Groups larger than 5 (+ $25/person)', surchargeAmount: 25.00, isActive: true }
        ],
        isActive: true
    },
    {
        id: 'pkg3',
        name: 'VIP Event Coverage',
        description: 'Full coverage of special private events, parties, or dinners.',
        basePrice: 899.00,
        includedDigitals: 100,
        durationMins: 180,
        recommendedShotList: ['Venue details', 'Guest arrivals', 'Speeches', 'Candid interactions'],
        priceRules: [],
        isActive: false
    }
];

export const SessionTypesBuilderPage: React.FC = () => {
    const [packages, setPackages] = useState<SessionPackage[]>(MOCK_PACKAGES);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingPkg, setEditingPkg] = useState<Partial<SessionPackage>>({});
    const [newShot, setNewShot] = useState('');

    const openEditor = (pkg?: SessionPackage) => {
        if (pkg) {
            setEditingPkg({ ...pkg });
        } else {
            setEditingPkg({
                name: '',
                description: '',
                basePrice: 0,
                includedDigitals: 0,
                durationMins: 30,
                recommendedShotList: [],
                priceRules: [],
                isActive: true
            });
        }
        setIsEditorOpen(true);
    };

    const handleSave = () => {
        if (editingPkg.id) {
            setPackages(packages.map(p => p.id === editingPkg.id ? { ...p, ...editingPkg } as SessionPackage : p));
        } else {
            const newPackage = {
                ...editingPkg,
                id: Math.random().toString(36).substr(2, 9),
            } as SessionPackage;
            setPackages([...packages, newPackage]);
        }
        setIsEditorOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this package?')) {
            setPackages(packages.filter(p => p.id !== id));
        }
    };

    const addShot = () => {
        if (newShot.trim() && editingPkg.recommendedShotList) {
            setEditingPkg({
                ...editingPkg,
                recommendedShotList: [...editingPkg.recommendedShotList, newShot.trim()]
            });
            setNewShot('');
        }
    };

    const removeShot = (index: number) => {
        if (editingPkg.recommendedShotList) {
            setEditingPkg({
                ...editingPkg,
                recommendedShotList: editingPkg.recommendedShotList.filter((_, i) => i !== index)
            });
        }
    };

    const toggleRule = (ruleId: string) => {
        if (editingPkg.priceRules) {
            setEditingPkg({
                ...editingPkg,
                priceRules: editingPkg.priceRules.map(r => r.id === ruleId ? { ...r, isActive: !r.isActive } : r)
            });
        }
    };

    const addRule = (type: 'PeakHour' | 'GroupSize') => {
        const newRule: PriceRule = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            description: type === 'PeakHour' ? 'Peak hour surge' : 'Large group surcharge',
            surchargeAmount: 25.00,
            isActive: true
        };
        setEditingPkg({
            ...editingPkg,
            priceRules: [...(editingPkg.priceRules || []), newRule]
        });
    };

    const removeRule = (ruleId: string) => {
        if (editingPkg.priceRules) {
            setEditingPkg({
                ...editingPkg,
                priceRules: editingPkg.priceRules.filter(r => r.id !== ruleId)
            });
        }
    };

    return (
        <div className="w-full h-full p-6 flex flex-col">
            <PageHeader
                title="Session Packages Builder"
                subtitle="Configure photography packages, pricing rules, and standard shot lists."
                actions={
                    <Button variant="primary" onClick={() => openEditor()} className="flex items-center gap-2">
                        <Plus size={16} /> Create Package
                    </Button>
                }
            />

            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
                    {packages.map(pkg => (
                        <Card key={pkg.id} className={`flex flex-col h-full border ${pkg.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 dark:border-slate-700 opacity-75'}`}>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-white line-clamp-1">{pkg.name}</h3>
                                    {!pkg.isActive && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Draft</span>}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 min-h-[40px]">{pkg.description}</p>

                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                                        <DollarSign size={20} className="text-green-500 mb-1" />
                                        <div className="font-bold text-lg">${pkg.basePrice.toFixed(2)}</div>
                                        <div className="text-xs text-slate-500">Base Price</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                                        <ImageIcon size={20} className="text-blue-500 mb-1" />
                                        <div className="font-bold text-lg">{pkg.includedDigitals}</div>
                                        <div className="text-xs text-slate-500">Included Digitals</div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                                    <div className="flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Duration: {pkg.durationMins} mins</div>
                                    <div className="flex items-center gap-2"><Camera size={16} className="text-slate-400" /> {pkg.recommendedShotList.length} Recommended Shots</div>
                                    <div className="flex items-center gap-2"><Sun size={16} className="text-slate-400" /> {pkg.priceRules.filter(r => r.isActive).length} Active Price Rules</div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                    <Button variant="secondary" className="flex-1 flex items-center justify-center gap-2" onClick={() => openEditor(pkg)}>
                                        <Edit size={16} /> Edit
                                    </Button>
                                    <Button variant="ghost" className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(pkg.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Editor Modal */}
            <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingPkg.id ? "Edit Package" : "Create Package"}>
                <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto p-1">
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="checkbox" 
                            id="isActive"
                            checked={editingPkg.isActive}
                            onChange={(e) => setEditingPkg({...editingPkg, isActive: e.target.checked})}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium">Package is Active & Visible</label>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Package Name</label>
                        <Input 
                            value={editingPkg.name || ''} 
                            onChange={(e) => setEditingPkg({...editingPkg, name: e.target.value})} 
                            placeholder="e.g. Sunset Couple Experience"
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Description</label>
                        <textarea 
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={editingPkg.description || ''} 
                            onChange={(e) => setEditingPkg({...editingPkg, description: e.target.value})} 
                            placeholder="What does this package include?"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Base Price ($)</label>
                            <Input 
                                type="number"
                                value={editingPkg.basePrice || ''} 
                                onChange={(e) => setEditingPkg({...editingPkg, basePrice: Number(e.target.value)})} 
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Included Photos</label>
                            <Input 
                                type="number"
                                value={editingPkg.includedDigitals || ''} 
                                onChange={(e) => setEditingPkg({...editingPkg, includedDigitals: Number(e.target.value)})} 
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Duration (Mins)</label>
                            <Input 
                                type="number"
                                step="15"
                                value={editingPkg.durationMins || ''} 
                                onChange={(e) => setEditingPkg({...editingPkg, durationMins: Number(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><Camera size={18} /> Recommended Shot List</h4>
                        <div className="flex gap-2 mb-3">
                            <Input 
                                value={newShot}
                                onChange={(e) => setNewShot(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addShot()}
                                placeholder="Add a specific pose or location..."
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={addShot}>Add</Button>
                        </div>
                        <ul className="space-y-2">
                            {editingPkg.recommendedShotList?.map((shot, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded">
                                    <span className="flex items-center gap-2"><Check size={14} className="text-green-500"/> {shot}</span>
                                    <button onClick={() => removeShot(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                                </li>
                            ))}
                            {(!editingPkg.recommendedShotList || editingPkg.recommendedShotList.length === 0) && (
                                <p className="text-sm text-slate-500 italic">No shots recommended yet.</p>
                            )}
                        </ul>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold flex items-center gap-2"><Sun size={18} /> Price Rules & Surcharges</h4>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => addRule('PeakHour')} className="text-xs">
                                    + Peak Hr
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => addRule('GroupSize')} className="text-xs">
                                    + Group
                                </Button>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {editingPkg.priceRules?.map(rule => (
                                <div key={rule.id} className={`p-3 rounded border ${rule.isActive ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' : 'border-slate-200 bg-slate-50 dark:bg-slate-900 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={rule.isActive}
                                                onChange={() => toggleRule(rule.id)}
                                                className="rounded"
                                            />
                                            <span className="font-medium text-sm">{rule.type === 'PeakHour' ? 'Peak Hour Surcharge' : 'Group Size Surcharge'}</span>
                                        </div>
                                        <button onClick={() => removeRule(rule.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div className="col-span-2">
                                            <Input 
                                                value={rule.description}
                                                onChange={(e) => {
                                                    const updated = editingPkg.priceRules?.map(r => r.id === rule.id ? {...r, description: e.target.value} : r);
                                                    setEditingPkg({...editingPkg, priceRules: updated});
                                                }}
                                                placeholder="Description"
                                            />
                                        </div>
                                        <div>
                                            <Input 
                                                type="number"
                                                value={rule.surchargeAmount}
                                                onChange={(e) => {
                                                    const updated = editingPkg.priceRules?.map(r => r.id === rule.id ? {...r, surchargeAmount: Number(e.target.value)} : r);
                                                    setEditingPkg({...editingPkg, priceRules: updated});
                                                }}
                                                placeholder="Amount ($)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!editingPkg.priceRules || editingPkg.priceRules.length === 0) && (
                                <p className="text-sm text-slate-500 italic">No price rules defined.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Package</Button>
                </div>
            </Modal>
        </div>
    );
};

export default SessionTypesBuilderPage;
