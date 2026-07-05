import React from 'react';
import { PhotoCategory } from '../../../types';

interface CategorySidebarProps {
  categories: (PhotoCategory | 'All' | 'Matched')[];
  selectedCategory: PhotoCategory | 'All' | 'Matched';
  onSelectCategory: (cat: PhotoCategory | 'All' | 'Matched') => void;
  matchedPhotosCount: number;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  matchedPhotosCount,
}) => {
  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-800/50 p-4 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <h2 className="text-xl font-bold mb-4">Categories</h2>
      <nav className="space-y-2 flex-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`w-full text-left px-4 py-2 rounded-lg text-lg transition-colors flex justify-between items-center ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{cat}</span>
            {cat === 'Matched' && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                {matchedPhotosCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};
