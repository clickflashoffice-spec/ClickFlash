import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../CurrencyContext.tsx';
import { apiService } from '../../../services/apiService.ts';
import { Currency } from '../../../types.ts';
import Spinner from '../../common/Spinner.tsx';

const CurrencySettings: React.FC = () => {
    const { baseCurrency } = useCurrency();
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrencies = async () => {
            const data = await (apiService as any).getCurrencies();
            setCurrencies(data);
            setLoading(false);
        };
        fetchCurrencies();
    }, []);

    const handleRateChange = (code: string, newRate: number) => {
        setCurrencies(prev => prev.map(c => c.code === code ? { ...c, rate: newRate } : c));
    };
    
    const handleSaveChanges = async () => {
      try {
        await (apiService as any).updateCurrencies(currencies);
        alert("Currency settings saved!");
      } catch (error) {
        alert("Failed to save currency settings.");
      }
    }
    
    const inputStyles = "w-48 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-slate-900 dark:text-white disabled:bg-slate-200 dark:disabled:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none";


    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold">Manage Currencies & Exchange Rates</h2>
                 <button onClick={handleSaveChanges} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                    Save Changes
                </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                The base currency is <span className="font-bold">{baseCurrency.name} ({baseCurrency.code})</span>. All product prices and order totals are stored in this currency. Exchange rates are relative to this base.
            </p>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="p-4">Currency</th>
                            <th className="p-4">Code</th>
                            <th className="p-4">Symbol</th>
                            <th className="p-4">Rate (1 {baseCurrency.code} = X)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currencies.map(c => (
                            <tr key={c.code} className="border-b border-slate-200 dark:border-slate-700/50">
                                <td className="p-4 font-semibold">{c.name}</td>
                                <td className="p-4 font-mono">{c.code}</td>
                                <td className="p-4">{c.symbol}</td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        value={c.rate}
                                        onChange={e => handleRateChange(c.code, Number(e.target.value))}
                                        disabled={c.code === baseCurrency.code}
                                        className={inputStyles}
                                        step="0.01"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CurrencySettings;