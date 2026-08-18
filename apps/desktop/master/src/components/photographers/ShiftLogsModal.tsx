import { Modal, Spinner } from "@clickflash/ui";
import React, { useState, useEffect } from 'react';

import { Photographer } from '../../types.ts';

import { logger } from '@/utils/logger';

interface ShiftLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    photographer: Photographer;
}

interface ShiftRecord {
    id: number;
    photographer_id: string;
    station_id: string | null;
    shift_type: string;
    timestamp: string;
    biometric_method: string | null;
    biometric_confidence: number | null;
    synced: number;
}

const ShiftLogsModal: React.FC<ShiftLogsModalProps> = ({ isOpen, onClose, photographer }) => {
    const [history, setHistory] = useState<ShiftRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && photographer.id) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/shifts/proxy?photographerId=${photographer.id}&t=${Date.now()}`, { credentials: 'include' });
                    if (response.ok) {
                        const data = await response.json();
                        setHistory(data);
                    }
                } catch (error) {
                    logger.error('Failed to fetch shift proxy logs', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, photographer.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Shift Logs: ${photographer.name}`} size="lg">
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Synced</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center p-8">
                                    <Spinner size="small" />
                                </td>
                            </tr>
                        ) : history.length > 0 ? history.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-3 font-mono text-sm">
                                    {new Date(entry.timestamp.replace(' ', 'T') + (entry.timestamp.includes('Z') ? '' : 'Z')).toLocaleString()}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.shift_type === 'CLOCK_IN'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {entry.shift_type.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-3 text-sm">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {entry.biometric_method || 'STANDARD'}
                                    </span>
                                    {entry.biometric_confidence !== null && entry.biometric_confidence !== undefined && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Score: {Number(entry.biometric_confidence).toFixed(2)}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3">
                                    {entry.synced ? (
                                        <span className="text-emerald-500 flex items-center gap-1 text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Yes
                                        </span>
                                    ) : (
                                        <span className="text-amber-500 flex items-center gap-1 text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            Pending
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-slate-500 dark:text-slate-400">No shift logs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="pt-6 flex justify-end border-t border-slate-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Close</button>
            </div>
        </Modal>
    );
};

export default ShiftLogsModal;
