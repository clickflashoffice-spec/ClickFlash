import React, { useRef, useLayoutEffect } from 'react';
import { Order } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';

interface OrderStatusPageProps {
    order: Order;
}

const OrderStatusPage: React.FC<OrderStatusPageProps> = ({ order }) => {
    const { formatCurrency } = useCurrency();

    const steps = [
        { status: 'Pending', label: 'Order Registered', description: 'Captured in Master Repository.' },
        { status: 'Processing', label: 'Cinematic Processing', description: 'Retouching and Tiering in progress.' },
        { status: 'Completed', label: 'Ready for Fulfillment', description: 'Available for physical collection.' },
        { status: 'Delivered', label: 'Successfully Delivered', description: 'Treasured memories delivered.' }
    ];

    let currentStepIndex = 0;
    if (order.status === 'Pending') currentStepIndex = 0;
    else if ((order.status as string) === 'Processing') currentStepIndex = 1;
    else if (order.status === 'Completed') currentStepIndex = 2;
    else if (order.status === 'Delivered') currentStepIndex = 3;

    const statusLineRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (statusLineRef.current) {
            statusLineRef.current.style.setProperty('--status-width', `calc(${(currentStepIndex / (steps.length - 1)) * 100}% - 16px)`);
        }
    }, [currentStepIndex, steps.length]);

    return (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-down pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Status <span className="text-cyan-400">Tracking</span></h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">
                        Reference Hash: <span className="text-slate-300 font-mono">{order.id}</span>
                    </p>
                </div>
                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Current Phase</div>
                    <div className="text-sm font-black text-cyan-400 uppercase italic tracking-tighter mt-0.5">{steps[currentStepIndex].label}</div>
                </div>
            </div>

            {/* Cinematic Progress Tracker */}
            <div className="relative mb-24 px-4">
                <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-full"></div>
                <div
                    ref={statusLineRef}
                    className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-cyan-500 rounded-full transition-all duration-[1500ms] shadow-[0_0_20px_rgba(34,211,238,0.5)] [width:var(--status-width)]"
                ></div>

                <div className="flex justify-between w-full relative z-10">
                    {steps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                            <div key={step.status} className="flex flex-col items-center group">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${isCompleted
                                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_25px_rgba(34,211,238,0.4)]'
                                    : 'bg-slate-900 border-white/10 text-slate-600'
                                    } ${isCurrent ? 'scale-110 ring-4 ring-cyan-500/20' : ''}`}>
                                    {isCompleted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <span className="text-xs font-black">{index + 1}</span>
                                    )}
                                </div>
                                <div className="absolute top-16 w-32 text-center transform transition-all duration-500">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-white' : 'text-slate-500'}`}>{step.label}</p>
                                    {isCurrent && <p className="text-[9px] font-bold text-cyan-500/60 uppercase tracking-tighter mt-1 animate-pulse">{step.description}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-16">
                <div className="lg:col-span-2 space-y-8">
                    <div className="premium-card p-8 border border-white/5">
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 italic border-b border-white/5 pb-4">Manifest <span className="text-cyan-400">Details</span></h2>
                        <div className="space-y-6">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center space-x-6 pb-6 border-b border-white/5 last:border-0 last:pb-0">
                                    <div className="relative group flex-shrink-0">
                                        <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-10 group-hover:opacity-30 transition-opacity"></div>
                                        {item.photo ? (
                                            <img src={item.photo.url} alt={item.name} className="w-20 h-20 rounded-2xl object-cover bg-slate-900 border border-white/10 relative z-10" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/10 relative z-10">
                                                <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white uppercase tracking-tight truncate">{item.name}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{item.format} <span className="text-slate-700">•</span> Quantity {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-white italic">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Order Aggregate</span>
                            <span className="text-3xl font-black text-white italic tracking-tighter">{formatCurrency(order.total)}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="premium-card p-8 border border-white/5">
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 italic">Support <span className="text-cyan-400">Concierge</span></h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-8">
                            Our agents are standing by to assist with your premium fulfillment.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all group">
                                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl group-hover:bg-cyan-500 group-hover:text-white transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Email Hub</div>
                                    <div className="text-[10px] font-bold text-slate-300">support@starmaster.photo</div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all group">
                                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Local Presence</div>
                                    <div className="text-[10px] font-bold text-slate-300">Atrium Photography Desk</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default OrderStatusPage;
