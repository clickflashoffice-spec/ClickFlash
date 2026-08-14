import React, { useState } from 'react';

interface OnScreenKeyboardProps {
    value: string;
    onChange: (value: string) => void;
    onClose?: () => void;
}

type KeyDef = {
    display: string | React.ReactNode;
    value: string;
    grow?: number;
    className?: string;
};

const BackspaceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>;
const ShiftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;

const growClasses: Record<string, string> = {
    '0.5': 'grow-[0.5]',
    '1': 'grow',
    '1.5': 'grow-[1.5]',
    '2': 'grow-[2]',
    '8': 'grow-[8]'
};

const Key: React.FC<{ def: KeyDef; onClick: (value: string) => void }> = ({ def, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(def.value)}
        className={`h-14 flex items-center justify-center rounded-lg text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 ${growClasses[String(def.grow || 1)] || 'grow'} ${def.className}`}
    >
        {def.display}
    </button>
);


const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({ value, onChange, onClose }) => {
    const [layout, setLayout] = useState<'alpha' | 'numeric' | 'symbols'>('alpha');
    const [shift, setShift] = useState(false);

    const handleKeyPress = (key: string) => {
        switch (key) {
            case 'Backspace':
                onChange(value.slice(0, -1));
                break;
            case 'Space':
                onChange(value + ' ');
                break;
            case 'Shift':
                setShift(!shift);
                break;
            case '123':
                setLayout('numeric');
                setShift(false);
                break;
            case 'ABC':
                setLayout('alpha');
                setShift(false);
                break;
            case '#+=':
                setLayout('symbols');
                setShift(false);
                break;
            case 'Done':
                if (onClose) onClose();
                break;
            default:
                const char = shift ? key.toUpperCase() : key.toLowerCase();
                onChange(value + char);
                if (shift) {
                    setShift(false);
                }
                break;
        }
    };

    const keyClass = 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500';
    const secondaryKeyClass = 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600';

    const alphaLayout: KeyDef[][] = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(k => ({ display: k, value: k, className: keyClass })),
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(k => ({ display: k, value: k, className: keyClass })),
        [
            { display: <ShiftIcon />, value: 'Shift', grow: 1.5, className: shift ? 'bg-blue-600 text-white' : secondaryKeyClass },
            ...['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(k => ({ display: k, value: k, className: keyClass })),
            { display: <BackspaceIcon />, value: 'Backspace', grow: 1.5, className: secondaryKeyClass }
        ],
        [
            { display: '123', value: '123', grow: 2, className: secondaryKeyClass },
            { display: 'space', value: 'Space', grow: 6, className: keyClass },
            { display: '.', value: '.', grow: 1, className: secondaryKeyClass },
            ...(onClose ? [{ display: 'Done', value: 'Done', grow: 2, className: 'bg-blue-600 text-white hover:bg-blue-700' }] : [])
        ]
    ];

    const numericLayout: KeyDef[][] = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => ({ display: k, value: k, className: keyClass })),
        ['@', '#', '$', '%', '&', '-', '+', '(', ')', '/'].map(k => ({ display: k, value: k, className: keyClass })),
        [
            { display: '#+=', value: '#+=', grow: 1.5, className: secondaryKeyClass },
            ...['*', '"', "'", ':', ';', '!', '?'].map(k => ({ display: k, value: k, className: keyClass })),
            { display: <BackspaceIcon />, value: 'Backspace', grow: 1.5, className: secondaryKeyClass }
        ],
        [
            { display: 'ABC', value: 'ABC', grow: 2, className: secondaryKeyClass },
            { display: 'space', value: 'Space', grow: 6, className: keyClass },
            { display: '.', value: '.', grow: 1, className: secondaryKeyClass },
            ...(onClose ? [{ display: 'Done', value: 'Done', grow: 2, className: 'bg-blue-600 text-white hover:bg-blue-700' }] : [])
        ]
    ];

    const symbolsLayout: KeyDef[][] = [
        ['~', '`', '|', '•', '√', 'π', '÷', '×', '¶', '∆'].map(k => ({ display: k, value: k, className: keyClass })),
        ['£', '€', '¥', '¢', '^', '°', '=', '{', '}', '\\'].map(k => ({ display: k, value: k, className: keyClass })),
        [
            { display: '123', value: '123', grow: 1.5, className: secondaryKeyClass },
            ...['©', '®', '™', '✓', '[', ']', '<', '>'].map(k => ({ display: k, value: k, className: keyClass })),
            { display: <BackspaceIcon />, value: 'Backspace', grow: 1.5, className: secondaryKeyClass }
        ],
        [
            { display: 'ABC', value: 'ABC', grow: 2, className: secondaryKeyClass },
            { display: 'space', value: 'Space', grow: 6, className: keyClass },
            { display: '.', value: '.', grow: 1, className: secondaryKeyClass },
            ...(onClose ? [{ display: 'Done', value: 'Done', grow: 2, className: 'bg-blue-600 text-white hover:bg-blue-700' }] : [])
        ]
    ];

    const currentLayout = layout === 'alpha' ? alphaLayout : (layout === 'numeric' ? numericLayout : symbolsLayout);

    return (
        <div className="w-full p-2 bg-slate-100 dark:bg-slate-900 rounded-lg space-y-2">
            {currentLayout.map((row, i) => (
                <div key={i} className="flex justify-center space-x-1.5">
                    {/* Special case for 3rd alpha row to add some padding for centering */}
                    {layout === 'alpha' && i === 1 && <div className="grow-[0.5]"></div>}
                    {row.map((keyDef, j) => (
                        <Key
                            key={`${keyDef.value}-${j}`}
                            def={{ ...keyDef, display: (layout === 'alpha' && shift && keyDef.value.length === 1) ? keyDef.value.toUpperCase() : keyDef.display }}
                            onClick={handleKeyPress}
                        />
                    ))}
                    {layout === 'alpha' && i === 1 && <div className="grow-[0.5]"></div>}
                </div>
            ))}
        </div>
    );
};

export default OnScreenKeyboard;
