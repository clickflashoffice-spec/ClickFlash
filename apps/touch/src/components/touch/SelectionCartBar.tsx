import React from 'react';

interface SelectionCartBarProps {
    onShowCart: () => void;
    count: number;
}

const SelectionCartBar: React.FC<SelectionCartBarProps> = ({ onShowCart, count }) => {
    return (
        <button onClick={onShowCart} data-testid="cart-button" className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full shadow-lg flex flex-col items-center justify-center border-4 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
             {count > 0 && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white font-bold text-sm rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                    {count}
                </div>
            )}
        </button>
    );
};

export default SelectionCartBar;