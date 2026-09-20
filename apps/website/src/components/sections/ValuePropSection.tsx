"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Target, Award } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

const values = [
    {
        title: "Enterprise Reliability",
        description: "Built on an offline-first architecture that ensures your event never stops, even if the internet does.",
        icon: Shield
    },
    {
        title: "Zero Latency",
        description: "Instant photo browsing and on-site selection through our high-speed local Ethernet bridge.",
        icon: Zap
    },
    {
        title: "Automated Marketing",
        description: "Convert every guest into a lead with integrated AI marketing and cloud-based upsell recovery.",
        icon: Target
    },
    {
        title: "Luxury Standards",
        description: "Designed for the world's most demanding photography studios and high-end event planners.",
        icon: Award
    }
];

export function ValuePropSection() {
    return (
        <section className="py-32 bg-zinc-950">
            <div className="container mx-auto px-6">
                <SectionHeader
                    title="Why the Elite Choose Us"
                    subtitle="Performance & Luxury"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {values.map((value, index) => (
                        <motion.div
                            key={value.title}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full bg-[#0B111F]/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <value.icon className="w-6 h-6 text-cyan-700" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-serif font-medium text-white mb-3">{value.title}</h3>
                                    <p className="text-zinc-500 text-sm leading-relaxed">
                                        {value.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
