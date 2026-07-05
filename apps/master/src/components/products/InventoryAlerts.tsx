import React from 'react';
import { Product } from '../../types';

export const InventoryAlerts: React.FC<{ lowStockProducts: Product[] }> = ({ lowStockProducts }) => {
    if (lowStockProducts.length === 0) return null;

    return (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200 p-4 rounded-xl flex items-start gap-3 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
                <h3 className="font-bold text-sm">Low Inventory Warning</h3>
                <p className="text-xs mt-0.5">The following products have stock levels below 10 units: <span className="font-bold">{lowStockProducts.map(p => p.name).join(', ')}</span></p>
            </div>
        </div>
    );
};
