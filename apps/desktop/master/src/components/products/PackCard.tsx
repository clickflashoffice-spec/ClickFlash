import { Card } from "@clickflash/ui";
import React from 'react';
import { Pack } from '../../types';

export const PackCard: React.FC<{
    pack: Pack;
    formatCurrency: (amount: number) => string;
    onEdit: (pack: Pack) => void;
    onDelete: (id: string, name: string) => void;
}> = React.memo(({ pack, formatCurrency, onEdit, onDelete }) => (
    <Card key={pack.id} className="flex flex-col h-full hover:shadow-lg transition-all duration-300">
        <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{pack.name}</h3>
            <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-xl font-bold text-sm">
                {formatCurrency(pack.price)}
            </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex-grow">{pack.description || 'No description provided.'}</p>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
            <button
                onClick={() => onEdit(pack)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Edit pack ${pack.name}`}
            >
                Edit
            </button>
            <button
                onClick={() => onDelete(pack.id, pack.name)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={`Delete pack ${pack.name}`}
            >
                Delete
            </button>
        </div>
    </Card>
), (prevProps, nextProps) => {
    return prevProps.pack.id === nextProps.pack.id &&
        prevProps.pack.name === nextProps.pack.name &&
        prevProps.pack.price === nextProps.pack.price &&
        prevProps.pack.description === nextProps.pack.description;
});

PackCard.displayName = 'PackCard';
