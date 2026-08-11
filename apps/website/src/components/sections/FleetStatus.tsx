"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Camera, Globe, Zap, ShieldCheck } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface MetricProps {
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: string;
    color: string;
}

function MetricCard({ label, value, icon: Icon, trend, color }: MetricProps) {
    return (
        <GlassPanel className="p-6 group hover:border-cyan-500/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${color} border border-slate-100 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-slate-900" />
                </div>
                {trend && (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <div className="space-y-1">
                <h4 className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">
                    {label}
                </h4>
                <div className="text-3xl font-serif font-medium text-slate-900 tabular-nums">
                    {value}
                </div>
            </div>
        </GlassPanel>
    );
}

export function FleetStatus() {
    const [photos, setPhotos] = useState(1248230);
    const [activeDesks, setActiveDesks] = useState(42);

    // Simulation logic for live data
    useEffect(() => {
        const interval = setInterval(() => {
            setPhotos(prev => prev + Math.floor(Math.random() * 5));
            if (Math.random() > 0.95) setActiveDesks(prev => prev + (Math.random() > 0.5 ? 1 : -1));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section id="fleet-status" className="py-16 md:py-24 lg:py-32 bg-slate-50">
            <div className="container mx-auto px-6">
                <SectionHeader
                    title="Global Fleet Pulse"
                    subtitle="Real-Time Network Telemetry"
                    light={true}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Main Metric Large */}
                    <div className="lg:col-span-2">
                        <MetricCard
                            label="Global Photos Processed"
                            value={photos.toLocaleString()}
                            icon={Camera}
                            trend="+12% today"
                            color="from-cyan-500 to-cyan-600"
                        />
                    </div>

                    {/* Smaller Metrics */}
                    <MetricCard
                        label="Active Master Desks"
                        value={activeDesks}
                        icon={Activity}
                        color="from-blue-500 to-cyan-600"
                    />

                    <MetricCard
                        label="Network Reliability"
                        value="99.98%"
                        icon={ShieldCheck}
                        color="from-emerald-500 to-teal-600"
                    />

                    {/* Bento Grid - Secondary Layer */}
                    <GlassPanel className="lg:col-span-2 p-8 flex flex-col justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-xl font-serif font-medium text-slate-900 mb-2">Regional Ingestion</h3>
                            <p className="text-slate-600 text-sm max-w-xs">High-volume data streams currently active across 12 resort zones.</p>
                        </div>

                        {/* World Map Mockup */}
                        <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
                            <Globe className="w-64 h-64 text-cyan-700" />
                        </div>

                        <div className="mt-8 flex gap-4 relative z-10">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex flex-col gap-1">
                                    <div className="h-12 w-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="w-full bg-cyan-700"
                                            animate={{ height: ["40%", "80%", "50%", "90%", "60%"] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                                        />
                                    </div>
                                    <span className="text-[8px] uppercase tracking-tighter text-zinc-600 font-bold">Z-{i}</span>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>

                    <div className="lg:col-span-2 bg-zinc-900/40 rounded-2xl border border-white/5 p-8 flex items-center justify-between group overflow-hidden">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-cyan-700 rounded-full animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                                <span className="text-sm font-bold uppercase tracking-widest text-cyan-700">Live Infrastructure</span>
                            </div>
                            <h3 className="text-2xl font-serif font-medium text-slate-900">Zero-Latency <br />Protocol</h3>
                            <p className="text-slate-600 text-sm max-w-xs">Proprietary offline-first sync engine designed for multi-TB libraries.</p>
                        </div>
                        <Zap className="w-24 h-24 text-slate-900/5 -rotate-12 group-hover:rotate-0 group-hover:text-cyan-700/20 transition-all duration-700" />
                    </div>
                </div>
            </div>
        </section>
    );
}
