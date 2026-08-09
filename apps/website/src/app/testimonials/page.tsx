import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Client Testimonials & Reviews",
  description: "Read what our clients say about ClickFlash photography services. Real reviews from weddings, resorts, events, and portrait sessions.",
  path: "/testimonials",
});

const testimonials = [
    {
        name: "Sarah & Michael Chen",
        event: "Wedding Photography",
        location: "Maldives Resort",
        rating: 5,
        image: "/testimonials/couple1.jpg",
        quote: "ClickFlash captured every magical moment of our destination wedding. The photos are absolutely breathtaking - even better than we imagined. The team was professional, creative, and made us feel so comfortable throughout the day.",
        date: "December 2025"
    },
    {
        name: "James Rivera",
        event: "Corporate Event",
        location: "Marriott Convention Center",
        rating: 5,
        image: "/testimonials/corporate1.jpg",
        quote: "We've used ClickFlash for three consecutive annual conferences now. Their ability to capture candid moments while staying invisible is remarkable. The turnaround time is incredible too.",
        date: "November 2025"
    },
    {
        name: "The Thompson Family",
        event: "Family Portrait",
        location: "Sunset Beach",
        rating: 5,
        image: "/testimonials/family1.jpg",
        quote: "Getting our family of 6 (including 3 kids under 10) to cooperate for photos seemed impossible. The photographer was patient, fun, and somehow got amazing shots of everyone. We're thrilled!",
        date: "October 2025"
    },
    {
        name: "Emily Watson",
        event: "Birthday Celebration",
        location: "Private Villa",
        rating: 5,
        image: "/testimonials/party1.jpg",
        quote: "My 30th birthday party photos turned out stunning! The lighting, the candids, the group shots - everything was perfect. I've been sharing them non-stop.",
        date: "September 2025"
    },
    {
        name: "David & Lisa Park",
        event: "Engagement Session",
        location: "Central Park",
        rating: 5,
        image: "/testimonials/engagement1.jpg",
        quote: "We were nervous about being in front of the camera, but the photographer made us laugh and forget we were being photographed. The natural, romantic shots are exactly what we wanted.",
        date: "August 2025"
    },
    {
        name: "Grand Hyatt Bali",
        event: "Resort Photography",
        location: "Bali, Indonesia",
        rating: 5,
        image: "/testimonials/resort1.jpg",
        quote: "ClickFlash has been our preferred photography partner for 2 years. Their on-site kiosk system has transformed our guest experience. Photos delivered before checkout - guests love it!",
        date: "Ongoing Partnership"
    }
];

const stats = [
    { value: "500+", label: "Happy Clients" },
    { value: "10K+", label: "Photos Delivered" },
    { value: "4.9", label: "Average Rating" },
    { value: "15+", label: "Countries" }
];

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    className={`w-5 h-5 ${i < rating ? "text-amber-400" : "text-gray-600"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

export default function TestimonialsPage() {
    return (
        <main className="min-h-screen bg-[#0B111F] pt-32 pb-24">
            {/* Hero Section */}
            <section className="max-w-5xl mx-auto px-6 text-center mb-24">
                <h1 className="text-6xl md:text-8xl font-serif text-white mb-8 uppercase tracking-tighter">
                    Clie<span className="text-cyan-700">nt</span> <span className="text-cyan-700 italic">Stories</span>
                </h1>
                <p className="text-xl text-white/70 font-medium max-w-2xl mx-auto">
                    Real reviews from real clients. Discover the ClickFlash experience through the eyes of our amazing community.
                </p>
            </section>

            {/* Stats Bar */}
            <section className="max-w-6xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="text-center p-10 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-sm transition-all hover:bg-[#0B111F] hover:shadow-xl hover:shadow-slate-200/50">
                            <div className="text-4xl md:text-5xl font-serif text-cyan-700 font-bold mb-3 tracking-tighter">{stat.value}</div>
                            <div className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials Grid */}
            <section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {testimonials.map((testimonial, idx) => (
                        <div
                            key={idx}
                            className="bg-[#0B111F] border border-white/10 rounded-[3rem] p-10 flex flex-col shadow-2xl shadow-slate-200/50 relative group transition-all duration-500 hover:-translate-y-2 hover:shadow-cyan-500/10"
                        >
                            <div className="mb-6 flex justify-between items-start">
                                <StarRating rating={testimonial.rating} />
                                <div className="text-cyan-700/20 text-6xl font-serif leading-none transition-colors group-hover:text-cyan-700/40">“</div>
                            </div>
                            <blockquote className="text-white/70 mb-8 flex-grow leading-relaxed font-medium">
                                &ldquo;{testimonial.quote}&rdquo;
                            </blockquote>
                            <div className="pt-8 border-t border-slate-50">
                                <div className="font-serif text-2xl text-white mb-1 tracking-tight">{testimonial.name}</div>
                                <div className="text-cyan-700 text-[10px] font-black uppercase tracking-widest mb-3">{testimonial.event}</div>
                                <div className="text-white/70 text-xs font-medium">{testimonial.location} • {testimonial.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-7xl mx-auto px-6">
                <div className="bg-white/5 border border-white/10 rounded-[4rem] p-16 md:p-24 text-center relative overflow-hidden shadow-sm">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-cyan-700/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

                    <h2 className="text-4xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter relative z-10">
                        Ready to Create <br /> <span className="text-cyan-700 italic">Your Story?</span>
                    </h2>
                    <p className="text-white/70 mb-12 max-w-xl mx-auto text-lg font-medium relative z-10">
                        Join hundreds of satisfied clients who trusted us to capture their most precious moments with cinematic precision.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
                        <Link
                            href="https://www.fotiqo.com/book/v/clickflash"
                            className="bg-slate-900 text-white font-black uppercase py-6 px-14 rounded-full hover:bg-cyan-700 transition-all shadow-xl text-[11px] tracking-widest"
                        >
                            Book Your Session
                        </Link>
                        <Link
                            href="/portfolio"
                            className="bg-[#0B111F] text-white border border-white/20 font-black uppercase py-6 px-14 rounded-full hover:bg-white/5 transition-all text-[11px] tracking-widest"
                        >
                            View Portfolio
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
