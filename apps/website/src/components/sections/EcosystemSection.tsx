"use client";

import { motion } from "framer-motion";
import { Monitor, Smartphone, CloudUpload, BarChart3, ShoppingBag, ArrowRight } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";

const apps = [
    {
        title: "Master Portal",
        subtitle: "The Command Center",
        description: "Offline-first desktop engine for high-volume ingestion and pro processing.",
        icon: Monitor,
        color: "from-blue-500/20 to-cyan-500/20",
        features: ["Local Ingestion", "Order Batching", "Cloud Sync"]
    },
    {
        title: "Touch Kiosk",
        subtitle: "Guest Interaction",
        description: "Zero-latency local interface for guest browsing and on-site purchases.",
        icon: Smartphone,
        color: "from-purple-500/20 to-pink-500/20",
        features: ["Offline POS", "Face Search", "Instant Selection"]
    },
    {
        title: "Money Trash",
        subtitle: "The Profit Engine",
        description: "Automated cloud uploader that triggers marketing for unsold memories.",
        icon: CloudUpload,
        color: "from-cyan-500/20 to-cyan-600/20",
        features: ["Upsell Automation", "Email Marketing", "Lead Capture"]
    },
    {
        title: "Management Hub",
        subtitle: "Business Intelligence",
        description: "Centralized web dashboard for global analytics and staff management.",
        icon: BarChart3,
        color: "from-emerald-500/20 to-teal-500/20",
        features: ["Global Sales", "Staff Permissions", "Daily Reports"]
    },
    {
        title: "Gallery & Shop",
        subtitle: "Client Destination",
        description: "E-commerce marketplace where guests buy albums and prints.",
        icon: ShoppingBag,
        color: "from-rose-500/20 to-red-500/20",
        features: ["Digital Downloads", "Physical Prints", "Secure Payments"]
    }
];

export function EcosystemSection() {
    return (
        <section id="ecosystem" className="py-16 md:py-24 lg:py-32 bg-slate-50 overflow-hidden">
            <div className="container mx-auto px-6">
                <SectionHeader
                    title="The ClickFlash Protocol"
                    subtitle="Integrated Ecosystem"
                    light={true}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 md:gap-y-16">
                    {apps.map((app, index) => (
                        <motion.div
                            key={app.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <GlassPanel className="h-full flex flex-col group p-6 md:p-8">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-6 md:mb-10 border border-white/5 shadow-2xl shadow-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
                                    <app.icon className="w-7 h-7 text-white" />
                                </div>

                                <div className="flex-grow">
                                    <h3 className="text-xl md:text-2xl font-serif font-medium text-slate-900 mb-2">{app.title}</h3>
                                    <p className="text-cyan-500 text-xs uppercase tracking-widest font-bold mb-4">{app.subtitle}</p>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                        {app.description}
                                    </p>

                                    <ul className="space-y-3 mb-8">
                                        {app.features.map(feature => (
                                            <li key={feature} className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-1 h-1 bg-cyan-500 rounded-full" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Button variant="ghost" className="w-full group/btn mt-8 border-t border-white/5 pt-6" size="sm">
                                    Learn More <ArrowRight className="w-3 h-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                            </GlassPanel>
                        </motion.div>
                    ))}

                    {/* Empty Space for 3D Model Focus (In the middle or side) */}
                    <div className="hidden lg:block h-full" />

                    {/* CTA Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 5 * 0.1 }}
                    >
                        <div className="h-full bg-cyan-500 rounded-2xl p-6 md:p-8 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-slate-800 transition-all duration-500 hover:scale-105 active:scale-95 shadow-xl shadow-cyan-500/20">
                            <h3 className="text-2xl md:text-3xl font-serif font-medium text-white mb-4 transition-transform group-hover:text-cyan-500">Ready to Scale?</h3>
                            <p className="text-white/60 text-sm mb-8">Deploy the complete ClickFlash ecosystem to your business today.</p>
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                                <ArrowRight className="w-8 h-8" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
