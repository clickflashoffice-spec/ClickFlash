
import React, { useState } from 'react';
import Modal from '../common/Modal.tsx';
import { PhotoCategory } from '../../types.ts';

interface TransferCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (from: PhotoCategory, to: PhotoCategory) => void;
    availableCategories: PhotoCategory[];
}

const TransferCategoryModal: React.FC<TransferCategoryModalProps> = ({ isOpen, onClose, onConfirm, availableCategories }) => {
    const [fromCategory, setFromCategory] = useState(availableCategories[0]);
    const [toCategory, setToCategory] = useState(availableCategories[1] || availableCategories[0]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (fromCategory === toCategory) {
            alert("Source and destination categories must be different.");
            return;
        }
        onConfirm(fromCategory, toCategory);
        onClose();
    };

    const selectStyle = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Transfer Photos" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-slate-500 dark:text-slate-400">Move all photos from one category to another.</p>
                
                <div>
                    <label htmlFor="from-category" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">From</label>
                    <select id="from-category" value={fromCategory} onChange={e => setFromCategory(e.target.value)} className={selectStyle} required>
                        {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>

                <div>
                    <label htmlFor="to-category" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">To</label>
                    <select id="to-category" value={toCategory} onChange={e => setToCategory(e.target.value)} className={selectStyle} required>
                        {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Transfer</button>
                </div>
            </form>
        </Modal>
    );
};

export default TransferCategoryModal;
