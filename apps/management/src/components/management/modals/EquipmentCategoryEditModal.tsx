import React, { useState, useEffect } from 'react';
import { Modal } from "@clickflash/ui";
import { EquipmentCategory } from '../../../types';

interface EquipmentCategoryEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Omit<EquipmentCategory, 'id'> | EquipmentCategory) => void;
    categoryToEdit: EquipmentCategory | null;
}

const EquipmentCategoryEditModal: React.FC<EquipmentCategoryEditModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
    const isNew = !categoryToEdit;
    const [category, setCategory] = useState(categoryToEdit || { label: '' });

    useEffect(() => {
        if (isOpen) {
            setCategory(categoryToEdit || { label: '' });
        }
    }, [categoryToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCategory(prev => ({ ...prev, label: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(category);
    };

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add Equipment Category" : "Edit Equipment Category"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Category Label</label>
                    <input type="text" name="label" value={category.label} onChange={handleChange} required className={inputStyles} />
                    {isNew && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The ID will be automatically generated from the label (e.g., "Camera Gear" becomes "CAMERA_GEAR").</p>}
                </div>
                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Category</button>
                </div>
            </form>
        </Modal>
    );
};

export default EquipmentCategoryEditModal;