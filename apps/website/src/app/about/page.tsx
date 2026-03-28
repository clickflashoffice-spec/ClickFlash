"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Award, Users, Globe } from "lucide-react";

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white pt-24 md:pt-28 lg:pt-32 pb-16 md:pb-20 lg:pb-24">
            {/* HERO SECTION */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16 md:mb-24 lg:mb-32">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[12px] mb-4 block">About Us</span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 mb-6 md:mb-8 leading-tight tracking-tighter">
                            Creating Smiles and Memories <span className="text-cyan-500">Since 2008</span>
                        </h1>
                        <p className="text-slate-600 text-base md:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto px-2">
                            ClickFlash, established in 2008, specializes in resort and wedding photography. 
                            We capture unique moments and emotions in Tunisia and worldwide. Our growing 
                            team ensures every memory is unforgettable with high-quality services, products, 
                            and the latest technology at top destinations.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* FEATURES GRID */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16 md:mb-24 lg:mb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {[
                        {
                            icon: Users,
                            title: "Experienced and Professional Team",
                            desc: "Our skilled photographers are dedicated to capturing your best moments with professionalism and creativity."
                        },
                        {
                            icon: Globe,
                            title: "Wide and Diverse Destinations",
                            desc: "Capture memories at stunning locations in Tunisia and beyond, where breathtaking moments await you."
                        },
                        {
                            icon: Award,
                            title: "Customized and Personalized Services",
                            desc: "We offer tailored photography services to meet your unique needs, ensuring every photo reflects your personal style."
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center p-6 md:p-8"
                        >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-cyan-50 flex items-center justify-center mx-auto mb-4 md:mb-6">
                                <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-cyan-500" />
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-3 md:mb-4">{feature.title}</h3>
                            <p className="text-slate-500 text-sm md:text-base leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* IMAGE + TEXT SECTION */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16 md:mb-24 lg:mb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative h-[350px] sm:h-[450px] md:h-[500px] lg:h-[600px] rounded-2xl md:rounded-3xl overflow-hidden"
                    >
                        <Image
                            src="/images/portfolio/MAR_0304.JPG"
                            alt="ClickFlash Team"
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[11px] md:text-[12px] mb-4 block">Our Story</span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-6 md:mb-8 tracking-tighter">
                            A Journey of Passion and Excellence
                        </h2>
                        <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-4 md:mb-6">
                            What started as a small photography studio in Sousse, Tunisia, has grown into 
                            a trusted name in professional photography. Over the years, we've had the 
                            privilege of capturing thousands of special moments - from intimate weddings 
                            to grand resort openings.
                        </p>
                        <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-6 md:mb-8">
                            Our commitment to excellence and our passion for storytelling through images 
                            has earned us the trust of clients across Tunisia and beyond. We believe 
                            every moment deserves to be remembered beautifully.
                        </p>
                        <ul className="space-y-3">
                            {[
                                "15+ years of experience",
                                "Professional team of 50+ photographers",
                                "100,000+ happy clients",
                                "Coverage across Tunisia and international destinations"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-800 font-bold">
                                    <CheckCircle2 className="text-cyan-500 w-5 h-5" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </section>

            {/* CREATIVITY SECTION */}
            <section className="py-16 md:py-24 lg:py-32 bg-slate-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center px-2">
                        <span className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[11px] md:text-[12px] mb-4 block">Our Creativity</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-6 md:mb-8 tracking-tighter">
                            Immortalizing Memories
                        </h2>
                        <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-8 md:mb-12">
                            Through our creativity, we aim to immortalize tourists' festive and cherished 
                            moments at the best locations. This has earned us an unrivaled reputation and 
                            confidence within hotels, holiday clubs, and resorts across Tunisia.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                            {[
                                { number: "15+", label: "Years Experience" },
                                { number: "50+", label: "Professional Photographers" },
                                { number: "100K+", label: "Happy Clients" },
                                { number: "30+", label: "Destinations" }
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-black text-cyan-500 mb-2">{stat.number}</div>
                                    <div className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* TEAM SECTION */}
            <section className="py-16 md:py-24 lg:py-32 container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 md:mb-16 lg:mb-20">
                    <span className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[11px] md:text-[12px] mb-4 block">Our Team</span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        Meet Our Expert Photographers
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                    {[
                        { name: "Ahmed Ben Ali", role: "Lead Photographer", image: "/images/portfolio/1a5aeeb8-c8ee-4991-abcb-a9a08b5aa7a5.jpg" },
                        { name: "Sarah Johnson", role: "Wedding Specialist", image: "/images/portfolio/d753e241-b318-4356-91be-b51b899e2394.jpg" },
                        { name: "Michael Chen", role: "Creative Director", image: "/images/portfolio/eec2e1da-34bf-4629-b63b-bdcef8b7f11b.jpg" }
                    ].map((member, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center"
                        >
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto mb-4 md:mb-6 rounded-full overflow-hidden">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-1 md:mb-2">{member.name}</h3>
                            <p className="text-slate-500 text-sm md:text-base">{member.role}</p>
                        </motion.div>
                    ))}
                </div>
            </section>
        </main>
    );
}
