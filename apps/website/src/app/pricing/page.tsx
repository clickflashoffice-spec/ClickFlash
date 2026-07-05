"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

const packages: {
    name: string;
    description: string;
    price: string;
    features: string[];
    popular?: boolean;
    highlighted?: boolean;
    cta: string;
}[] = [
    {
        name: "Starter",
        description: "Perfect for independent photographers starting their digital journey.",
        price: "Free",
        features: [
            "Up to 3 user accounts",
            "Basic client galleries",
            "5GB secure storage",
            "Standard support",
        ],
        cta: "Start Free",
    },
    {
        name: "Studio Pro",
        description: "Everything a growing photography studio needs to thrive.",
        price: "$49/mo",
        features: [
            "Unlimited users",
            "1TB secure storage",
            "AI face matching & auto-cull",
            "White-label galleries",
            "Referral program access",
        ],
        highlighted: true,
        popular: true,
        cta: "Start Free Trial",
    },
    {
        name: "Enterprise",
        description: "Custom solutions for high-volume agencies and resorts.",
        price: "Custom",
        features: [
            "Unlimited storage",
            "On-premise deployment options",
            "Dedicated account manager",
            "Custom API integrations",
        ],
        cta: "Contact Sales",
    }
];

const faqs: {
    question: string;
    answer: string;
}[] = [
    {
        question: "Is there a setup fee?",
        answer: "No, there are no hidden setup fees. You can sign up and start using the platform immediately on the Starter or Studio Pro plans."
    },
    {
        question: "Can I upgrade or downgrade anytime?",
        answer: "Yes, you can manage your subscription from the ClickFlash Management Hub and adjust your tier at any time."
    },
    {
        question: "What happens if I exceed my storage limit?",
        answer: "We will notify you when you reach 90% of your storage limit. You can easily purchase additional storage packs or upgrade your tier."
    },
    {
        question: "Is white-labeling included?",
        answer: "White-labeling (removing the 'Powered by ClickFlash' branding from your client galleries) is included in the Studio Pro and Enterprise tiers."
    }
];

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-white pt-40 pb-24">
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <SectionHeader
                        title="Platform Pricing"
                        subtitle="Scale Your Studio"
                        align="center"
                        light={true}
                    />
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium mt-8 leading-relaxed">
                        The ultimate ecosystem for photography businesses. Choose the tier that fits your growth.
                    </p>
                </motion.div>
            </section>

            {/* Pricing Cards */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {packages.map((pkg, index) => (
                        <motion.div
                            key={pkg.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-[3rem] p-10 transition-all duration-500 group hover:-translate-y-2 ${pkg.highlighted
                                ? "bg-white border-2 border-cyan-400 shadow-2xl shadow-cyan-500/10"
                                : "bg-slate-50 border border-slate-100"
                                }`}
                        >
                            {pkg.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-8 py-2.5 rounded-full shadow-lg shadow-cyan-500/20">
                                    Recommended
                                </div>
                            )}
                            <div className="mb-10">
                                <span className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[11px] mb-2 block">{pkg.name}</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{pkg.price}</span>
                                </div>
                                <p className="text-slate-500 mt-4 font-medium text-sm leading-relaxed">{pkg.description}</p>
                            </div>

                            <ul className="space-y-4 mb-12 border-t border-slate-200 pt-8">
                                {pkg.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-4">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${pkg.highlighted ? 'bg-cyan-500 text-white' : 'bg-cyan-100 text-cyan-600'}`}>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-sm text-slate-700 font-bold">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/signup"
                                className={`block w-full text-center py-5 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all transform active:scale-95 ${pkg.highlighted
                                    ? "bg-cyan-500 text-white hover:bg-slate-900 shadow-lg shadow-cyan-500/20"
                                    : "bg-slate-900 text-white hover:bg-cyan-500 shadow-lg shadow-slate-900/10"
                                    }`}
                            >
                                {pkg.cta}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* FAQ Section */}
            <section className="max-w-5xl mx-auto px-6 py-24 mb-32 bg-slate-50/50 rounded-[4rem] border border-slate-100">
                <div className="mb-16">
                    <SectionHeader
                        title="Common Questions"
                        subtitle="Good to Know"
                        align="center"
                        light={true}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-shadow duration-500">
                            <h4 className="text-slate-900 font-black uppercase tracking-tight text-sm mb-4">
                                {faq.question}
                            </h4>
                            <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                {faq.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 md:mb-20">
                <div className="bg-slate-100 rounded-3xl md:rounded-[4rem] p-10 md:p-16 lg:p-24 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] group-hover:bg-cyan-500/20 transition-all duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                    <div className="relative z-10 text-center px-2">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 mb-6 md:mb-8 tracking-tighter">
                            Ready to <span className="text-cyan-500 italic">Upgrade?</span>
                        </h2>
                        <p className="text-slate-500 mb-8 md:mb-12 text-base md:text-lg font-medium max-w-xl mx-auto leading-relaxed">
                            Start using the platform that powers the world's most successful photography studios.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
                            <Link
                                href="/signup"
                                className="bg-cyan-500 text-white font-black uppercase tracking-widest text-[10px] md:text-[11px] py-4 md:py-6 px-8 md:px-12 rounded-full hover:bg-slate-900 transition-all shadow-xl shadow-cyan-500/20 active:scale-95"
                            >
                                Start Free Trial
                            </Link>
                            <Link
                                href="/contact"
                                className="bg-transparent text-slate-900 font-black uppercase tracking-widest text-[10px] md:text-[11px] py-4 md:py-6 px-8 md:px-12 rounded-full hover:bg-slate-900 hover:text-white transition-all border-2 border-slate-300 active:scale-95"
                            >
                                Contact Sales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
