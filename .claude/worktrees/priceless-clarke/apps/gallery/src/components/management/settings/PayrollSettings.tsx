import React, { useState, useEffect } from 'react';
import Card from '../../common/Card.tsx';
import { Photographer } from '../../../types.ts';
import { useCurrency } from '../../CurrencyContext.tsx';
import { apiService } from '../../../services/apiService.ts';
import Spinner from '../../common/Spinner.tsx';

const PayrollSettings: React.FC = () => {
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [loading, setLoading] = useState(true);
    const { currency } = useCurrency();

    useEffect(() => {
        const fetchUsers = async () => {
            const users = await apiService.getUsers();
            setPhotographers(users);
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const handleSettingChange = (id: string, field: keyof Photographer, value: string | number) => {
        setPhotographers(prev =>
            prev.map(p => {
                if (p.id === id) {
                    let newValues: Partial<Photographer> = {};

                    if (field === 'payrollType') {
                        newValues = { payrollType: value as 'Commission' | 'Salary' };
                        if (value === 'Salary') newValues.commissionRate = 0;
                        if (value === 'Commission') newValues.monthlySalary = 0;
                    } else if (field === 'monthlySalary') {
                        newValues = { monthlySalary: Number(value) / currency.rate };
                    } else if (field === 'commissionRate') {
                        newValues = { commissionRate: Number(value) / 100 };
                    } else {
                        newValues = { [field]: value };
                    }
                    return { ...p, ...newValues };
                }
                return p;
            })
        );
    };
    
    const handleSave = async () => {
      // In a real app, this would be an API call to update photographers' data
      try {
        await Promise.all(photographers.map(p => apiService.updateUser(p.id, p)));
        alert('Payroll settings saved!');
      } catch (error) {
        alert('Failed to save settings.');
      }
    }

    if (loading) return <Spinner />;
    
    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold">Payroll Settings</h2>
                 <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                    Save Changes
                </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Configure the payment method for each photographer. Choose between a fixed monthly salary or a commission-based percentage of their total sales.
            </p>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="p-4">Photographer</th>
                            <th className="p-4 w-48">Payroll Type</th>
                            <th className="p-4">Rate / Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {photographers.map(p => (
                            <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                <td className="p-4 font-semibold flex items-center space-x-3">
                                    <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full" />
                                    <span>{p.name}</span>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={p.payrollType}
                                        onChange={e => handleSettingChange(p.id, 'payrollType', e.target.value)}
                                        className={inputStyles}
                                    >
                                        <option value="Commission">Commission</option>
                                        <option value="Salary">Salary</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    {p.payrollType === 'Commission' ? (
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={((p.commissionRate || 0) * 100).toFixed(2)}
                                                onChange={e => handleSettingChange(p.id, 'commissionRate', Number(e.target.value))}
                                                className={`${inputStyles} pl-3 pr-8`}
                                            />
                                            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">%</span>
                                        </div>
                                    ) : (
                                         <div className="relative">
                                            <input
                                                type="number"
                                                value={((p.monthlySalary || 0) * currency.rate).toFixed(0)}
                                                onChange={e => handleSettingChange(p.id, 'monthlySalary', Number(e.target.value))}
                                                className={`${inputStyles} pl-8 pr-3`}
                                            />
                                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">{currency.symbol}</span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PayrollSettings;