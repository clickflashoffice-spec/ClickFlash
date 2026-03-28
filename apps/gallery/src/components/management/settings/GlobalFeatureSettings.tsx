
import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/apiService';
import { Destination } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';

const GlobalFeatureSettings: React.FC = () => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State tracks feature flags for each destination ID
    const [featureFlags, setFeatureFlags] = useState<Record<string, { ai: boolean, face: boolean, watermark: boolean }>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const dests = await apiService.getDestinations();
                setDestinations(dests);
                
                // Initialize flags from API data
                const flags: any = {};
                dests.forEach(d => {
                    flags[d.id] = d.features || { ai: true, face: true, watermark: true };
                });
                setFeatureFlags(flags);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleFeature = (destId: string, feature: 'ai' | 'face' | 'watermark') => {
        setFeatureFlags(prev => ({
            ...prev,
            [destId]: {
                ...prev[destId],
                [feature]: !prev[destId][feature]
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Update all destinations in parallel
            await Promise.all(destinations.map(dest => {
                const features = featureFlags[dest.id];
                if (features) {
                    return apiService.updateDestination(dest.id, { ...dest, features });
                }
                return Promise.resolve();
            }));
            alert("Global feature configuration saved. Updates will be pushed to Master Portals during next sync.");
        } catch (error) {
            console.error("Failed to save global features", error);
            alert("Error saving features. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Global Feature Configuration</h2>
                <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                    Push Updates
                </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Control which premium features are enabled for each destination. Disabling a feature here will hide it from the Master Portal interface at that location.
            </p>

            <div className="space-y-4">
                {destinations.map(dest => (
                    <Card key={dest.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold">{dest.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{dest.country} • {dest.type}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-6">
                            <div className="flex items-center space-x-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={featureFlags[dest.id]?.ai} 
                                        onChange={() => toggleFeature(dest.id, 'ai')}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                </label>
                                <span className="text-sm font-medium">Generative AI</span>
                            </div>

                            <div className="flex items-center space-x-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={featureFlags[dest.id]?.face} 
                                        onChange={() => toggleFeature(dest.id, 'face')}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                                <span className="text-sm font-medium">Face Search</span>
                            </div>

                            <div className="flex items-center space-x-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={featureFlags[dest.id]?.watermark} 
                                        onChange={() => toggleFeature(dest.id, 'watermark')}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                                </label>
                                <span className="text-sm font-medium">Dynamic Watermark</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default GlobalFeatureSettings;
