import React from 'react';

interface NumericKeypadProps {
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    small?: boolean;
}

const Key: React.FC<{ value: string; onClick: (value: string) => void; className?: string, small?: boolean }> = ({ value, onClick, className, small }) => (
    <button
        onClick={() => onClick(value)}
        className={`w-full rounded-2xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 active:scale-95 border ${className} ${small ? 'min-h-[64px] text-2xl font-medium bg-slate-900/60 hover:bg-slate-800 border-slate-700/50 text-slate-200' : 'min-h-[96px] text-4xl font-light bg-slate-900/60 hover:bg-slate-800 border-slate-700/50 text-slate-200'}`}
    >
        {value}
    </button>
);

const NumericKeypad: React.FC<NumericKeypadProps> = ({ onKeyPress, onDelete, small = false }) => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'];

    return (
        <>
            {keys.map((key, index) => key ? <Key key={key} value={key} onClick={onKeyPress} small={small} /> : <div key={index}></div>)}

            <button
                onClick={onDelete}
                className={`w-full rounded-2xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-500/20 active:scale-95 border ${small ? 'min-h-[64px] bg-red-950/40 text-red-400 hover:bg-red-900/50 border-red-900/50' : 'min-h-[96px] bg-red-950/40 text-red-400 hover:bg-red-900/50 border-red-900/50'}`}
                aria-label="Delete last character"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={small ? "h-6 w-6" : "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
            </button>
        </>
    );
};

export default NumericKeypad;