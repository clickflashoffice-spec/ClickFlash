
import React, { useState } from 'react';
import Modal from '../common/Modal.tsx';
import { User } from '../../types.ts';

interface ObjectivesModalProps {
    isOpen: boolean;
    onClose: () => void;
    photographer: User;
    onSave: (photographerId: string, target: number) => void;
}

import { apiService } from '../../services/apiService';

const ObjectivesModal: React.FC<ObjectivesModalProps> = ({ isOpen, onClose, photographer, onSave }) => {
    const [newTarget, setNewTarget] = useState<number | ''>('');
    const [history, setHistory] = useState<any[]>([]);
    const [todayTarget, setTodayTarget] = useState<number | null>(null);

    React.useEffect(() => {
        if (isOpen && photographer) {
            loadHistory();
        }
    }, [isOpen, photographer]);

    const loadHistory = async () => {
        try {
            // Fetch history from API
            const objectives = await apiService.getAll(photographer.id);
            setHistory(objectives);

            // Check for today's objective
            const today = new Date().toISOString().split('T')[0];
            const found = objectives.find((o: any) => o.date === today);
            if (found) {
                setTodayTarget(found.target);
            } else {
                setTodayTarget(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const pastObjectives = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const handleSave = async () => {
        if (newTarget !== '' && newTarget > 0) {
            // Call parent handler which should call the API
            await onSave(photographer.id, newTarget);
            setNewTarget('');
            // Refresh history logic to confirm update
            loadHistory();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Daily Objective: ${photographer.name} `} size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side: Set new objective */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Current Daily Photo Target</h3>
                        <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg min-h-[80px] flex items-center justify-center">
                            <p className="text-slate-900 dark:text-slate-100 text-3xl font-bold">
                                {todayTarget !== null
                                    ? `${todayTarget.toLocaleString()} photos`
                                    : (photographer.dailyPhotoTarget ? `${photographer.dailyPhotoTarget.toLocaleString()} photos (Default)` : 'No target set')}
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Set New Photo Target for Today</h3>
                        <input
                            type="number"
                            value={newTarget}
                            onChange={(e) => setNewTarget(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                            placeholder="e.g., 500"
                            className="w-full h-14 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-slate-900 dark:text-white text-xl text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                            onClick={handleSave}
                            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500"
                            disabled={!newTarget || newTarget <= 0}
                        >
                            Set Target
                        </button>
                    </div>
                </div>

                {/* Right side: History */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Objective History</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg max-h-80 overflow-y-auto">
                        {pastObjectives.length > 0 ? (
                            <ul className="space-y-2">
                                {pastObjectives.map(obj => (
                                    <li key={obj.id} className="bg-white dark:bg-slate-700/50 p-3 rounded-md">
                                        <p className="font-semibold text-slate-800 dark:text-slate-300">{obj.target} photos</p>
                                        <div className="flex justify-between items-center text-sm mt-1">
                                            <span className="text-slate-500 dark:text-slate-400">{new Date(obj.date).toLocaleDateString()}</span>
                                            <span className={`px - 2 py - 0.5 rounded - full text - xs font - semibold ${obj.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                } `}>
                                                {obj.status}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No past objectives found.</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="pt-6 flex justify-end border-t border-slate-200 dark:border-slate-700 mt-6">
                <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Close</button>
            </div>
        </Modal>
    );
};

export default ObjectivesModal;