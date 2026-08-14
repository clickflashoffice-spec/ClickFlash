
import React, { useState } from 'react';
import { Order, OrderItem } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import { logger } from '@/utils/logger';

interface LabPrintFolderProps {
    order: Order;
    onBack: () => void;
    onUpdateOrder: (order: Order) => void;
}

const LabPrintFolder: React.FC<LabPrintFolderProps> = ({ order, onBack, onUpdateOrder }) => {
    const [printedItems, setPrintedItems] = useState<Set<string>>(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusUpdate = async (newStatus: 'Completed' | 'Delivered') => {
        if ((newStatus === 'Completed' || newStatus === 'Delivered') && !order.paymentMethod) {
            alert('Please edit the order to select a payment method before validating.');
            return;
        }

        setIsUpdating(true);
        try {
            const updatedOrder = await apiService.updateOrder(order.id, { status: newStatus });
            onUpdateOrder(updatedOrder);
        } catch (error) {
            logger.error("Failed to update order status", error);
            alert("Failed to update order status");
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePrint = (item: OrderItem) => {
        const url = item.photo?.url;
        if (!url) return;

        setPrintedItems(prev => new Set(prev).add(item.id));

        const w = window.open('', '_blank', 'width=1024,height=768');
        if (w) {
            w.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'none';">
                        <title>Print ${item.name}</title>
                        <style>
                            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #fff; }
                            img { max-width: 100%; max-height: 100%; object-fit: contain; }
                            @media print {
                                body { -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${url}" id="print-image" />
                    </body>
                </html>
            `);
            w.document.close();

            // Use DOM manipulation instead of inline scripts
            const img = w.document.getElementById('print-image');
            if (img) {
                img.onload = () => {
                    setTimeout(() => {
                        w.print();
                        w.close();
                    }, 500);
                };
                img.onerror = () => {
                    alert('Failed to load image.');
                    w.close();
                };
            }
        } else {
            alert('Popup blocked. Please allow popups for this site to print.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 font-sans animate-fadeIn selection:bg-blue-500 selection:text-white">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between mb-8 border-b border-slate-700 pb-6 gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-50">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                        title="Back to Orders"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Lab Print Folder
                        </h1>
                        <div className="flex items-center space-x-4 text-slate-400 text-sm mt-1">
                            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">#{order.id}</span>
                            <span>•</span>
                            <span className="text-white font-semibold">{order.clientName}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${order.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                order.status === 'Delivered' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {order.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Session Status</p>
                        <div className="flex items-center justify-end space-x-2">
                            <span className="text-green-400 font-bold text-xl">{printedItems.size}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-xl">{order.items.length} Items</span>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-700 hidden sm:block"></div>
                    <div className="flex gap-2">
                        {order.status === 'Pending' && (
                            <button
                                onClick={() => handleStatusUpdate('Completed')}
                                disabled={isUpdating}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Mark Completed
                            </button>
                        )}
                        {order.status === 'Completed' && (
                            <button
                                onClick={() => handleStatusUpdate('Delivered')}
                                disabled={isUpdating}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" /></svg>
                                Mark Delivered
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                {order.items.map((item) => {
                    const isPrinted = printedItems.has(item.id);
                    return (
                        <div
                            key={item.id}
                            className={`relative group bg-slate-800 rounded-xl overflow-hidden transition-all duration-300 border-2 ${isPrinted ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-[0.98] opacity-80' : 'border-slate-700 hover:border-blue-500 shadow-lg hover:shadow-blue-500/20'}`}
                        >
                            {/* Status Badge */}
                            {isPrinted && (
                                <div className="absolute top-3 right-3 z-20 bg-green-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded shadow-lg shadow-green-500/50 flex items-center pointer-events-none border-2 border-white/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    PRINTED
                                </div>
                            )}

                            {/* Quantity Badge */}
                            {item.quantity > 1 && (
                                <div className="absolute top-3 left-3 z-20 bg-red-600 text-white font-black px-3 py-1.5 rounded-md shadow-lg border-2 border-white/20 pointer-events-none text-sm">
                                    {item.quantity} COPIES
                                </div>
                            )}

                            {/* Image Preview */}
                            <div className="aspect-[4/3] bg-black relative flex items-center justify-center overflow-hidden">
                                {(item.photo?.url || (item as any).url) ? (
                                    <img
                                        src={item.photo?.url || (item as any).url}
                                        alt={item.name}
                                        className="w-full h-full object-contain select-none pointer-events-none"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : (
                                    <div className="text-slate-600 flex flex-col items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="font-medium">No Preview</span>
                                        {/* DEBUG INFO: Uncomment if needed */}
                                        {/* <pre className="text-[8px] max-w-full overflow-hidden">{JSON.stringify(item, null, 1)}</pre> */}
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="p-4 bg-slate-800">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-black text-white text-xl uppercase tracking-wide">{item.format}</h3>
                                        <p className="text-xs text-slate-400 font-mono truncate max-w-[180px] mt-1" title={item.photo?.title}>{item.photo?.title || item.name}</p>
                                    </div>
                                    {item.name.toLowerCase().includes('ai') && (
                                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30 pointer-events-none">AI EDIT</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handlePrint(item)}
                                    className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center uppercase tracking-wider transition-all transform active:scale-95 shadow-md ${isPrinted ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-slate-600' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    {isPrinted ? 'Reprint' : 'Print Photo'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LabPrintFolder;
