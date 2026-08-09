import { Card } from "@clickflash/ui";

import React, { useState } from 'react';

import useLocalStorage from '../../hooks/useLocalStorage';
import CategoryEditModal from '../modals/CategoryEditModal';

// Default categories to start with
const DEFAULT_CATEGORIES = ['Beach & Pool', 'Photo Session', 'Evening', 'Activities', 'Restaurant', 'Lobby', 'Excursion'];

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useLocalStorage<string[]>('photoCategories', DEFAULT_CATEGORIES);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<{ original: string, index: number } | null>(null);

    const handleAdd = (newCategory: string) => {
        if (categories.includes(newCategory)) {
            alert('Category already exists!');
            return;
        }
        setCategories([...categories, newCategory]);
        setIsModalOpen(false);
    };

    const handleEdit = (newCategory: string) => {
        if (categoryToEdit) {
            const newCats = [...categories];
            newCats[categoryToEdit.index] = newCategory;
            setCategories(newCats);
            setCategoryToEdit(null);
            setIsModalOpen(false);
        }
    };

    const handleDelete = (index: number) => {
        if (window.confirm(`Delete category "${categories[index]}"?`)) {
            const newCats = [...categories];
            newCats.splice(index, 1);
            setCategories(newCats);
        }
    };

    const openAdd = () => {
        setCategoryToEdit(null);
        setIsModalOpen(true);
    };

    const openEdit = (cat: string, index: number) => {
        setCategoryToEdit({ original: cat, index });
        setIsModalOpen(true);
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Photo Categories</h2>
                <button onClick={openAdd} aria-label="Add new category" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                    Add Category
                </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Define the categories available for tagging albums and photos. These help customers filter their gallery.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat, index) => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                        <span className="font-semibold">{cat}</span>
                        <div className="space-x-2">
                            <button onClick={() => openEdit(cat, index)} aria-label={`Edit category ${cat}`} className="text-blue-500 hover:text-blue-400 text-sm font-bold px-2">Edit</button>
                            <button onClick={() => handleDelete(index)} aria-label={`Delete category ${cat}`} className="text-red-500 hover:text-red-400 text-sm font-bold px-2">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <CategoryEditModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={categoryToEdit ? handleEdit : handleAdd}
                    initialValue={categoryToEdit?.original || ''}
                    title={categoryToEdit ? 'Edit Category' : 'Add New Category'}
                />
            )}
        </Card>
    );
};

export default CategoryManagement;
