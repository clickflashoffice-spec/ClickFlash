import React from 'react';
import Modal from '../common/Modal.tsx';
import { Photographer } from '../../types.ts';
import { MOCK_LOGIN_HISTORY } from '../../constants.ts';

interface ConnexionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photographer: Photographer;
}

const ConnexionHistoryModal: React.FC<ConnexionHistoryModalProps> = ({ isOpen, onClose, photographer }) => {
    const history = MOCK_LOGIN_HISTORY
        .filter(h => String(h.photographerId) === photographer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Login History: ${photographer.name}`} size="lg">
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length > 0 ? history.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                <td className="p-3 font-mono">{entry.date}</td>
                                <td className="p-3 font-mono">{entry.ip}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={2} className="text-center p-8 text-slate-500 dark:text-slate-400">No login history found.</td>
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