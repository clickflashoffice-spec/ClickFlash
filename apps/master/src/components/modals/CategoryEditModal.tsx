import { Modal } from "@clickflash/ui";

import React, { useState, useEffect } from 'react';

interface CategoryEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: string) => void;
    initialValue?: string;
    title: string;
}
const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ isOpen, onClose, onSave, initialValue = '', title }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) setValue(initialValue);
    }, [isOpen, initialValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            alert('Category name is required');
            return;
        }
        onSave(trimmedValue);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="category-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Category Name</label>
                    <input
                        id="category-name"
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        autoFocus
                        placeholder="Enter category name"
                        title="Category Name"
                    />
                </div>
                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save</button>
                </div>
            </form>
        </Modal>
    );
};

export default CategoryEditModal;
