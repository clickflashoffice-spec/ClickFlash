
import React, { useState, useEffect, useMemo } from 'react';
import { TouchKiosk } from '../../types.ts';
import KioskEditModal from '../modals/KioskEditModal.tsx';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import Card from '../common/Card.tsx';
import KioskPairing from './KioskPairing';
import { pb } from '../../services/pb.ts';
import Modal from '../common/Modal.tsx';

const KioskConnections: React.FC = () => {
    const [kiosks, setKiosks] = useState<TouchKiosk[]>([]);
    const [connectedKioskIds, setConnectedKioskIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [kioskToEdit, setKioskToEdit] = useState<TouchKiosk | null>(null);
    const [pairingKiosk, setPairingKiosk] = useState<TouchKiosk | null>(null);

    const fetchData = async () => {
        try {
            setError(null);
            const data = await apiService.getKiosks();
            setKiosks(data);
        } catch (err) {
            console.error('Failed to fetch kiosks:', err);
            setError('Failed to load kiosks. Please check your connection and try again.');
            setKiosks([]);
        } finally {
            setLoading(false);
        }
    };
    
    const refreshActiveSessions = async () => {
        try {
            const activeIds = await apiService.getActiveKioskSessions();
            setConnectedKioskIds(activeIds);
        } catch (err) {
            console.error('Failed to refresh active sessions:', err);
            // Don't show error for background refresh failures
        }
    };

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchData();
        refreshActiveSessions();
        
        // Poll every 10s for presence updates
        const interval = setInterval(refreshActiveSessions, 10000);
        
        // Realtime subscription for immediate updates if available
        try {
            pb.collection('kiosk_sessions').subscribe('*', () => {
                refreshActiveSessions();
            });
        } catch (e) {
            console.warn('Failed to subscribe to kiosk_sessions:', e);
        }

        return () => {
            clearInterval(interval);
            try {
                pb.collection('kiosk_sessions').unsubscribe('*');
            } catch (e) {
                // Ignore unsubscribe errors
            }
        };
        // Note: pb is a stable singleton export, so it doesn't need to be in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const displayedKiosks = useMemo((): TouchKiosk[] => {
        const allKnownKiosks: TouchKiosk[] = [...kiosks];
        const knownIds = new Set(kiosks.map(k => k.id));

        for (const kioskId of connectedKioskIds) {
            if (!knownIds.has(kioskId)) {
                allKnownKiosks.push({
                    id: kioskId,
                    name: 'Unconfigured Kiosk',
                    status: 'Connected',
                });
            }
        }

        return allKnownKiosks.map(k => ({
            ...k,
            status: connectedKioskIds.has(k.id) ? 'Connected' : 'Disconnected',
        }));
    }, [kiosks, connectedKioskIds]);

    const handleSaveKiosk = async (kioskData: Omit<TouchKiosk, 'id'> | TouchKiosk) => {
        try {
            if ('id' in kioskData && kioskData.id) {
                const existingKiosk = kiosks.find(k => k.id === kioskData.id);
                if (existingKiosk) {
                    await apiService.updateKiosk(kioskData.id, kioskData);
                } else {
                    await apiService.createKiosk(kioskData as TouchKiosk);
                }
            } else {
                await apiService.createKiosk(kioskData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Failed to save kiosk:', err);
            alert('Failed to save kiosk. Please try again.');
        }
    };

    const handleDeleteKiosk = async (kioskId: string) => {
        if (window.confirm("Are you sure you want to delete this kiosk configuration? The kiosk may reconnect as 'Unconfigured'.")) {
            try {
                await apiService.deleteKiosk(kioskId);
                fetchData();
            } catch (err) {
                console.error('Failed to delete kiosk:', err);
                alert('Failed to delete kiosk. Please try again.');
            }
        }
    };
    
    if (loading) return <Spinner />;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
                    <div className="flex items-center space-x-3 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Error Loading Kiosks</h3>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
                    <button 
                        onClick={() => {
                            setLoading(true);
                            fetchData();
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Live Kiosk Status</h2>
                <button onClick={() => { setKioskToEdit(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Add Kiosk Manually</button>
            </div>
            <Card className="!p-0 mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Kiosk ID</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedKiosks.map(kiosk => {
                                const isUnconfigured = kiosk.name === 'Unconfigured Kiosk';
                                return (
                                    <tr key={kiosk.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4">{kiosk.name}</td>
                                        <td className="p-4 font-mono">{kiosk.id}</td>
                                        <td className="p-4">
                                            <span className={`flex items-center space-x-2 ${kiosk.status === 'Connected' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                <span className={`h-2.5 w-2.5 rounded-full ${kiosk.status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span>{kiosk.status}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 space-x-2">
                                            <button onClick={() => setPairingKiosk(kiosk)} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold">
                                                Pair
                                            </button>
                                            <button onClick={() => { setKioskToEdit(kiosk); setIsModalOpen(true); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
                                                {isUnconfigured ? 'Configure' : 'Edit'}
                                            </button>
                                            {!isUnconfigured && (
                                                <button onClick={() => handleDeleteKiosk(kiosk.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold">Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Connect a New Kiosk</h2>
                <KioskPairing />
            </Card>

            {isModalOpen && <KioskEditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveKiosk} kioskToEdit={kioskToEdit} />}
            
            {pairingKiosk && (
                <Modal isOpen={!!pairingKiosk} onClose={() => setPairingKiosk(null)} title={`Pair ${pairingKiosk.name}`}>
                    <KioskPairing targetKioskId={pairingKiosk.id} targetKioskName={pairingKiosk.name} />
                    <div className="mt-4 flex justify-end">
                        <button onClick={() => setPairingKiosk(null)} className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg font-semibold">Close</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default KioskConnections;
