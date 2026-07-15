const fs = require('fs');

const path = 'C:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/components/customer/CheckoutModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state variables
content = content.replace(
    'const [isCustomTip, setIsCustomTip] = useState(false);',
    `const [isCustomTip, setIsCustomTip] = useState(false);
    const [advancePayCode, setAdvancePayCode] = useState<string>('');
    const [advancePayDiscount, setAdvancePayDiscount] = useState<number>(0);

    const handleApplyAdvancePay = () => {
        if (!advancePayCode) return;
        if (advancePayCode.toUpperCase().startsWith('ADV-')) {
            setAdvancePayDiscount(50);
            alert('AdvancePay credit of $50 applied!');
        } else {
            setAdvancePayDiscount(0);
            alert('Invalid AdvancePay code.');
        }
    };

    const finalTotal = Math.max(0, total + tipAmount - advancePayDiscount);`
);

// 2. Update handleCheckout total
content = content.replace(
    /total: total \+ tipAmount,/g,
    'total: finalTotal,'
);

// 3. Update JSX (AdvancePay section and final total)
content = content.replace(
    /<div className="text-right mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">/,
    `{/* AdvancePay Section */}
                    <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <h3 className="font-semibold mb-3">AdvancePay Credits</h3>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={advancePayCode}
                                onChange={(e) => setAdvancePayCode(e.target.value)}
                                className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded uppercase"
                                placeholder="Enter AdvancePay Code (e.g. ADV-123)"
                            />
                            <button
                                onClick={handleApplyAdvancePay}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                        {advancePayDiscount > 0 && (
                            <p className="text-green-500 text-sm mt-2 font-medium">
                                AdvancePay credit applied! (-{formatCurrency(advancePayDiscount)})
                            </p>
                        )}
                    </div>

                    <div className="text-right mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">`
);

content = content.replace(
    /<span className="text-3xl font-bold">{formatCurrency\(total \+ tipAmount\)}<\/span>/g,
    '<span className="text-3xl font-bold">{formatCurrency(finalTotal)}</span>'
);

content = content.replace(
    /{tipAmount > 0 && <div className="text-slate-500 dark:text-slate-400 mb-1">Tip: {formatCurrency\(tipAmount\)}<\/div>}/g,
    `{tipAmount > 0 && <div className="text-slate-500 dark:text-slate-400 mb-1">Tip: {formatCurrency(tipAmount)}</div>}
                        {advancePayDiscount > 0 && <div className="text-green-500 mb-1">AdvancePay Credit: -{formatCurrency(advancePayDiscount)}</div>}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update completed');
