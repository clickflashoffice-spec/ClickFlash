import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal.tsx';
import { Destination } from '../../../types.ts';

interface AddDestinationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (destination: Omit<Destination, 'id'> | Destination) => void;
    destinationToEdit: Destination | null;
}

const AddDestinationModal: React.FC<AddDestinationModalProps> = ({ isOpen, onClose, onSave, destinationToEdit }) => {
    const isNew = !destinationToEdit;
    const [destination, setDestination] = useState<Partial<Destination>>(destinationToEdit || { name: '', country: '', type: 'Resort' });

    useEffect(() => {
        if (isOpen) {
            if (destinationToEdit) {
                setDestination(destinationToEdit);
            } else {
                setDestination({ name: '', country: '', type: 'Resort', licenseKey: '' });
            }
        }
    }, [destinationToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDestination(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (destination.name && destination.country && destination.type) {
            onSave(destination as Destination);
        }
    };

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add Destination" : "Edit Destination"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Destination Name</label>
                    <input type="text" name="name" value={destination.name || ''} onChange={handleChange} required autoComplete="off" className={inputStyles} placeholder="e.g. Grand Hotel Resort" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Country</label>
                        <input type="text" name="country" value={destination.country || ''} onChange={handleChange} required autoComplete="country-name" className={inputStyles} placeholder="e.g. Spain" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Type</label>
                        <select name="type" value={destination.type || 'Resort'} onChange={handleChange} required className={inputStyles}>
                            <option value="Resort">Resort</option>
                            <option value="City">City</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Site Code (Internal ID)</label>
                    <input type="text" name="siteCode" value={destination.siteCode || ''} onChange={handleChange} autoComplete="off" className={inputStyles + " font-mono"} placeholder="e.g. TUN_01" />
                </div>

                {/* License Key Display */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <label className="block text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-1">Sync License Key</label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            name="licenseKey"
                            value={destination.licenseKey || ''}
                            onChange={handleChange}
                            autoComplete="off"
                            className="w-full bg-white dark:bg-slate-800 border border-yellow-300 dark:border-yellow-700 rounded-md px-3 py-2 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                            placeholder="Enter or generate key"
                        />
                        <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(destination.licenseKey || ''); }}
                            className="bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 px-3 py-2 rounded-md font-bold text-sm hover:bg-yellow-200 dark:hover:bg-700"
                            title="Copy"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                        Enter this key in the Master Portal settings (Local Portal Settings) at the destination to link it here.
                    </p>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Destination</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddDestinationModal;