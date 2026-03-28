"use client";

import { useState } from "react";
import { submitBooking } from "@/lib/api";

const sessionTypes = [
    {
        id: "wedding",
        name: "Wedding Photography",
        description: "Full-day coverage for your special day",
        duration: "6-12 hours",
        icon: "💒"
    },
    {
        id: "event",
        name: "Event Photography",
        description: "Corporate events, parties, and celebrations",
        duration: "2-8 hours",
        icon: "🎉"
    },
    {
        id: "portrait",
        name: "Portrait Session",
        description: "Individual, couple, or family portraits",
        duration: "1-2 hours",
        icon: "📸"
    },
    {
        id: "resort",
        name: "Resort Photography",
        description: "On-site photography services for hotels and resorts",
        duration: "Custom",
        icon: "🏝️"
    }
];

export default function BookingsPage() {
    const [formData, setFormData] = useState({
        name: "", // Combined firstName and lastName
        email: "",
        phone: "",
        event_date: "", // Renamed from date
        time: "",
        event_location: "", // Renamed from location
        message: "",
        service_type: "wedding" // Renamed from sessionType
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await submitBooking({
                ...formData,
                guest_count: "1", // Default for this simplified form
                budget_range: "undisclosed"
            });

            setIsSuccess(true);
            setFormData({
                name: "",
                email: "",
                phone: "",
                event_date: "",
                time: "",
                event_location: "",
                message: "",
                service_type: "wedding"
            });
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-white pt-24 pb-16">
            {/* Hero Section */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-6 uppercase tracking-tighter">
                    Book Your <span className="text-cyan-500">Session</span>
                </h1>
                <p className="text-xl text-slate-500 font-medium tracking-tight">
                    Let&apos;s capture your moments. Choose your session type and preferred date.
                </p>
            </section>

            {/* Success Message */}
            {isSuccess && (
                <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
                    <div className="bg-cyan-50 border border-cyan-100 rounded-3xl p-12 text-center shadow-xl">
                        <div className="text-5xl mb-6 scale-125">✨</div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter">
                            Booking Requested!
                        </h2>
                        <p className="text-slate-600 font-medium">
                            Thank you for choosing ClickFlash. We&apos;ve received your request and will contact you within 24 hours to confirm details.
                        </p>
                        <button
                            onClick={() => setIsSuccess(false)}
                            className="mt-8 text-cyan-600 hover:text-cyan-700 font-black uppercase tracking-widest text-sm"
                        >
                            Request another booking
                        </button>
                    </div>
                </section>
            )}

            {!isSuccess && (
                <>
                    {/* Session Types */}
                    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
                        <h2 className="text-xl font-black text-slate-500 mb-8 text-center uppercase tracking-widest">
                            Select Session Type
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {sessionTypes.map((session) => (
                                <label
                                    key={session.id}
                                    className="relative flex items-start p-8 bg-white border border-slate-100 rounded-3xl cursor-pointer hover:shadow-xl hover:border-cyan-500/50 transition-all group"
                                >
                                    <input
                                        type="radio"
                                        name="service_type"
                                        value={session.id}
                                        checked={formData.service_type === session.id}
                                        onChange={handleChange}
                                        className="peer sr-only"
                                    />
                                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent peer-checked:border-cyan-500 pointer-events-none transition-all"></div>
                                    <div className="text-5xl mr-6 group-hover:scale-110 transition-transform duration-300">{session.icon}</div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-slate-800 group-hover:text-cyan-500 transition-colors uppercase tracking-tight">
                                            {session.name}
                                        </h3>
                                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">{session.description}</p>
                                        <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mt-4">Duration: {session.duration}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Booking Form */}
                    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50/50 blur-3xl rounded-full -translate-x-12 translate-y-12 -z-10" />

                            <h2 className="text-2xl font-black text-slate-800 mb-10 uppercase tracking-tighter">
                                Contact Information
                            </h2>

                            {error && (
                                <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="phone" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label htmlFor="event_date" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                            Preferred Date *
                                        </label>
                                        <input
                                            type="date"
                                            id="event_date"
                                            name="event_date"
                                            required
                                            value={formData.event_date}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="time" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                            Preferred Time
                                        </label>
                                        <select
                                            id="time"
                                            name="time"
                                            value={formData.time}
                                            onChange={handleChange}
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold"
                                        >
                                            <option value="">Select a time</option>
                                            <option value="morning">Morning (8am - 12pm)</option>
                                            <option value="afternoon">Afternoon (12pm - 5pm)</option>
                                            <option value="evening">Evening (5pm - 9pm)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="event_location" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                        Event Location
                                    </label>
                                    <input
                                        type="text"
                                        id="event_location"
                                        name="event_location"
                                        value={formData.event_location}
                                        onChange={handleChange}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold"
                                        placeholder="Venue name or address"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                                        Additional Details
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={4}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all font-bold resize-none"
                                        placeholder="Tell us about your event, number of guests, special requirements..."
                                    ></textarea>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full bg-cyan-500 text-white font-black uppercase tracking-widest py-5 px-8 rounded-2xl hover:bg-slate-900 transition-all text-xl shadow-2xl shadow-cyan-500/20 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? 'Processing...' : 'Request Booking'}
                                    </button>
                                    <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mt-6">
                                        We&apos;ll get back to you within 24 hours to confirm availability.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </section>
                </>
            )}

            {/* Contact Alternative */}
            <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center">
                <p className="text-slate-500 font-bold">
                    Prefer to talk? Call us at{" "}
                    <a href="tel:+306945648936" className="text-cyan-600 hover:text-cyan-700 underline underline-offset-4">
                        +30 694 564 8936
                    </a>{" "}
                    or email{" "}
                    <a href="mailto:info@clickflash.photography" className="text-cyan-600 hover:text-cyan-700 underline underline-offset-4">
                        info@clickflash.photography
                    </a>
                </p>
            </section>
        </main>
    );
}
