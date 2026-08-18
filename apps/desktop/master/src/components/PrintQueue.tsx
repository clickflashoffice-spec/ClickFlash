import React from 'react';
import { useSync } from '../context/SyncContext';
import { PrintRequest } from '../context/SyncContext';
import { OrderItem } from '../types';

export const PrintQueue: React.FC = () => {
    const { printRequests, dismissPrintRequest } = useSync();

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                        Print Queue
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Real-time print requests from Touch Kiosks
                    </p>
                </div>
            </header>

            {printRequests.length === 0 ? (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-2xl p-12 text-center border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <div className="mx-auto w-24 h-24 mb-4 text-slate-300 dark:text-slate-600 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Queue is Empty</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        When customers order prints on the Touch Kiosks, they will appear here instantly.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {printRequests.map((req: PrintRequest) => {
                        const printItems = req.items.filter((item: OrderItem) => item.format !== 'Digital');
                        
                        return (
                            <div key={req.orderId} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                                <div className="p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-750 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                                                {req.orderId.substring(0, 8)}...
                                            </span>
                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-1">
                                            {req.customerName || 'Walk-in Customer'}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Kiosk</span>
                                        <div className="font-medium text-slate-700 dark:text-slate-300">{req.kioskId}</div>
                                    </div>
                                </div>
                                
                                <div className="p-4 flex-1">
                                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Items to Print</h4>
                                    <ul className="space-y-3">
                                        {printItems.map((item: OrderItem, idx: number) => (
                                            <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center space-x-4">
                                                    {item.photo?.url || (item as any).url ? (
                                                        <img src={item.photo?.url || (item as any).url} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-slate-200 dark:bg-slate-700" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-slate-800 dark:text-white line-clamp-1">{item.name}</div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">{item.format}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-slate-400 font-medium text-sm">Qty:</span>
                                                    <span className="font-bold text-lg text-slate-800 dark:text-white bg-white dark:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                                                        {item.quantity}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <button 
                                        onClick={() => dismissPrintRequest(req.orderId)}
                                        className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Mark as Printed</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PrintQueue;
