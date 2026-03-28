import React from 'react';

interface NumericKeypadProps {
    onKeyPress: (key: string) => void;
    onDelete: () => void;
    small?: boolean;
}

const Key: React.FC<{ value: string; onClick: (value: string) => void; className?: string, small?: boolean }> = ({ value, onClick, className, small }) => (
    <button
        onClick={() => onClick(value)}
        className={`w-full rounded-lg text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${small ? 'h-12 text-2xl bg-slate-600 hover:bg-slate-500' : 'h-20 text-4xl font-light bg-slate-700 hover:bg-slate-600'}`}
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
                className={`w-full rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 ${small ? 'h-12 bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-red-500' : 'h-20 bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-red-500'}`}
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