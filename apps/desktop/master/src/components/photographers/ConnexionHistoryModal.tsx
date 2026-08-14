import { Modal, Spinner } from "@clickflash/ui";
import React, { useState, useEffect } from 'react';

import { Photographer } from '../../types.ts';

import { logger } from '@/utils/logger';

interface ConnexionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    photographer: Photographer;
}

interface LoginRecord {
    id: number;
    email: string;
    ip_address: string;
    status: 'SUCCESS' | 'FAILED';
    reason: string;
    created_at: string;
}

const ConnexionHistoryModal: React.FC<ConnexionHistoryModalProps> = ({ isOpen, onClose, photographer }) => {
    const [history, setHistory] = useState<LoginRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && photographer.id) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/login-history?userId=${photographer.id}&t=${Date.now()}`, { credentials: 'include' });
                    if (response.ok) {
                        const data = await response.json();
                        setHistory(data);
                    }
                } catch (error) {
                    logger.error('Failed to fetch user login history', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, photographer.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Login History: ${photographer.name}`} size="lg">
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">IP Address</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="text-center p-8">
                                    <Spinner size="small" />
                                </td>
                            </tr>
                        ) : history.length > 0 ? history.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                <td className="p-3 font-mono text-sm">
                                    {new Date(entry.created_at.replace(' ', 'T') + (entry.created_at.includes('Z') ? '' : 'Z')).toLocaleString()}
                                </td>
                                <td className="p-3 font-mono text-sm">{entry.ip_address}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${entry.status === 'SUCCESS'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {entry.status}
                                    </span>
                                    {entry.status !== 'SUCCESS' && (
                                        <div className="text-xs text-red-500 mt-1">{entry.reason}</div>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="text-center p-8 text-slate-500 dark:text-slate-400">No login history found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="pt-6 flex justify-end border-t border-slate-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Close</button>
            </div>
        </Modal>
    );
};

export default ConnexionHistoryModal;