"use client";

import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { submitContactForm } from "@/lib/api";
import type { WebsiteSettings } from "@/lib/settings";
import { logger } from "@clickflash/logger";

interface ContactPageContentProps {
    settings: WebsiteSettings;
}

export default function ContactPageContent({ settings }: ContactPageContentProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        service: "",
        message: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus("idle");

        try {
            await submitContactForm(formData);
            setStatus("success");
            setFormData({ name: "", email: "", service: "", message: "" });
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            setStatus("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const {
        contactEmail = "clickflash.office@gmail.com",
        contactPhone = "+216 23 220 171",
        contactAddress = "Sousse, Tunisia",
        contactMapUrl,
        contactWhatsapp
    } = settings;

    return (
        <main className="min-h-screen bg-[#0B111F] pt-20 md:pt-24 pb-16 md:pb-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                <div className="text-center mb-12 md:mb-16 lg:mb-24">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif text-white mb-6 md:mb-8 uppercase tracking-tighter">
                        Get in <span className="text-cyan-700 font-sans">Touch</span>
                    </h1>
                    <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed px-4">
                        We&apos;re here to help you capture your most precious moments.
                        Reach out to our team for bookings, inquiries, or just to say hello.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 lg:gap-20">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-12"
                    >
                        <div>
                            <h2 className="text-2xl md:text-3xl font-serif text-white mb-6 md:mb-8">Contact Info</h2>
                            <div className="space-y-6 md:space-y-8">
                                <a href={`mailto:${contactEmail}`} className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:bg-cyan-700 group-hover:text-white transition-all duration-300">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1">Email Us</h3>
                                        <p className="text-white/70 text-sm mb-1">{contactEmail}</p>
                                        <p className="text-cyan-700 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">Send Email →</p>
                                    </div>
                                </a>

                                <a href={`tel:${contactPhone}`} className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:bg-cyan-700 group-hover:text-white transition-all duration-300">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1">Call Us</h3>
                                        <p className="text-white/70 text-sm mb-1">{contactPhone}</p>
                                        <p className="text-cyan-700 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">Call Now →</p>
                                    </div>
                                </a>

                                {/* WhatsApp */}
                                {contactWhatsapp && (
                                    <a href={`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-6 group">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:bg-[#25D366] group-hover:text-white transition-all duration-300">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1">Text Us</h3>
                                            <p className="text-white/70 text-sm mb-1">WhatsApp Available</p>
                                            <p className="text-[#25D366] text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">Chat Now →</p>
                                        </div>
                                    </a>
                                )}

                                <div className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:bg-cyan-700 group-hover:text-white transition-all duration-300">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-1">Location</h3>
                                        <p className="text-white/70 text-sm mb-1 whitespace-pre-line">{contactAddress}</p>
                                        <p className="text-cyan-700 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">View Map →</p>
                                    </div>
                                </div>
                            </div>

                            {/* Map Embed */}
                            {contactMapUrl && (
                                <div className="mt-12 rounded-3xl overflow-hidden shadow-lg border border-white/10 h-[300px]">
                                    <iframe
                                        src={contactMapUrl}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/5/50 p-6 md:p-10 lg:p-12 rounded-3xl md:rounded-[40px] border border-white/10"
                    >
                        <h2 className="text-2xl md:text-3xl font-serif text-white mb-6 md:mb-8">Send Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name-input" className="text-[11px] font-black uppercase tracking-widest text-white/70">Your Name</label>
                                    <input
                                        id="name-input"
                                        data-testid="name-input"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#0B111F] border border-white/20 p-4 rounded-2xl text-[14px] font-medium text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                        placeholder="John Doe"
                                        disabled={isSubmitting}
                                    />
                                    {status === "error" && !formData.name && <span data-testid="name-error" className="text-red-500 text-xs">Name is required</span>}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email-input" className="text-[11px] font-black uppercase tracking-widest text-white/70">Email Address</label>
                                    <input
                                        id="email-input"
                                        data-testid="email-input"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-[#0B111F] border border-white/20 p-4 rounded-2xl text-[14px] font-medium text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                        placeholder="john@example.com"
                                        disabled={isSubmitting}
                                    />
                                    {status === "error" && !formData.email && <span data-testid="email-error" className="text-red-500 text-xs">Email is required</span>}
                                    {status === "error" && formData.email && !formData.email.includes('@') && <span data-testid="email-error" className="text-red-500 text-xs">Please enter a valid email</span>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="service-input" className="text-[11px] font-black uppercase tracking-widest text-white/70">Service Type</label>
                                <select
                                    id="service-input"
                                    data-testid="service-input"
                                    value={formData.service}
                                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                    className="w-full bg-[#0B111F] border border-white/20 p-4 rounded-2xl text-[14px] font-medium text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all cursor-pointer"
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select a service...</option>
                                    <option value="Wedding">Wedding Photography</option>
                                    <option value="Event">Event Photography</option>
                                    <option value="Portrait">Portrait Session</option>
                                    <option value="Resort">Resort Photography</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="message-input" className="text-[11px] font-black uppercase tracking-widest text-white/70">Message</label>
                                <textarea
                                    id="message-input"
                                    data-testid="message-input"
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-[#0B111F] border border-white/20 p-4 rounded-2xl text-[14px] font-medium text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all min-h-[150px] resize-none"
                                    placeholder="Tell us about your event..."
                                    disabled={isSubmitting}
                                />
                                {status === "error" && !formData.message && <span data-testid="message-error" className="text-red-500 text-xs">Message is required</span>}
                            </div>

                            {status === "error" && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium animate-in fade-in">
                                    Something went wrong. Please try again or email us directly.
                                </div>
                            )}

                            {status === "success" && (
                                <div data-testid="success-message" className="p-4 bg-green-50 text-green-600 rounded-xl text-sm font-medium animate-in fade-in">
                                    Message sent successfully! We&apos;ll get back to you soon.
                                </div>
                            )}

                            <button
                                type="submit"
                                data-testid="submit-button"
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-cyan-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:scale-100"
                            >
                                {isSubmitting ? "Sending..." : "Send Message"}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
