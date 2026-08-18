import React from 'react';
import { Product } from '../../types';

export const ProductCard: React.FC<{
    product: Product;
    formatCurrency: (amount: number) => string;
    onEdit: (product: Product) => void;
    onDelete: (id: string, name: string) => void;
}> = React.memo(({ product, formatCurrency, onEdit, onDelete }) => {
    const isLowStock = (product.stock ?? 0) < 10;
    const isUnlimited = (product.stock ?? 0) === 9999;

    const getLinkedPrintFormat = (p: Product): string | null => {
        if (p.category?.toLowerCase() === 'print') {
            const dimensions = p.name.match(/\d+x\d+/);
            const size = dimensions ? dimensions[0] : 'Standard';
            return `Linked: ${size} Print Format`;
        }
        return null;
    };

    const linkedFormat = getLinkedPrintFormat(product);

    return (
        <div
            data-testid="product-row"
            onClick={() => onEdit(product)}
            className={`bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
                isLowStock ? 'border-red-300 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/5' : 'border-slate-200 dark:border-slate-700'
            }`}
        >
            <div>
                <div className="flex justify-between items-start mb-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base line-clamp-2 pr-2">
                        {product.name}
                    </h3>
                    <span className="text-green-600 dark:text-green-400 font-bold font-mono text-sm bg-green-500/10 px-2 py-0.5 rounded-lg flex-shrink-0">
                        {formatCurrency(product.price)}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {product.category}
                    </span>
                    {product.isFeatured ? (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            10% Member Rate
                        </span>
                    ) : null}
                    {isLowStock && (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            Low Stock
                        </span>
                    )}
                </div>

                {linkedFormat && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-3">
                        {linkedFormat}
                    </p>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    Stock Level:
                    <span className={`ml-1.5 font-bold ${
                        isLowStock ? 'text-red-500' : isUnlimited ? 'text-blue-500' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                        {isUnlimited ? 'Unlimited' : product.stock}
                    </span>
                </span>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => onEdit(product)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(product.id, product.name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.product.id === nextProps.product.id &&
        prevProps.product.name === nextProps.product.name &&
        prevProps.product.price === nextProps.product.price &&
        prevProps.product.stock === nextProps.product.stock &&
        prevProps.product.category === nextProps.product.category &&
        prevProps.product.isFeatured === nextProps.product.isFeatured;
});

ProductCard.displayName = 'ProductCard';
