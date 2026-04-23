import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "FAQ",
    description: "Frequently asked questions about ClickFlash photography services, booking, pricing, and more.",
};

const faqCategories = [
    {
        name: "Booking & Scheduling",
        faqs: [
            {
                question: "How far in advance should I book?",
                answer: "We recommend booking at least 2-4 weeks in advance for standard sessions and 2-3 months for weddings and large events. Popular dates fill up quickly!"
            },
            {
                question: "Can I reschedule my session?",
                answer: "Yes, rescheduling is free if done at least 48 hours before your session. Last-minute changes may incur a rescheduling fee."
            },
            {
                question: "What happens if it rains on my outdoor shoot?",
                answer: "We monitor weather closely and will contact you to reschedule if conditions are unfavorable. Alternatively, we can move to a covered location."
            },
            {
                question: "Do you travel for destination shoots?",
                answer: "Absolutely! We love destination shoots. Travel fees apply based on location. Contact us for a custom quote."
            }
        ]
    },
    {
        name: "Pricing & Payments",
        faqs: [
            {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, bank transfers, and cash. A 50% deposit is required to secure your booking."
            },
            {
                question: "Do you offer payment plans?",
                answer: "Yes! For Premium and Enterprise packages, we offer flexible payment plans. Contact us to discuss options."
            },
            {
                question: "Are there any hidden fees?",
                answer: "No hidden fees. Your quote includes everything discussed. Additional requests (extra hours, prints, albums) are quoted separately."
            },
            {
                question: "What is your cancellation policy?",
                answer: "Cancellations made 7+ days before are refunded minus a 20% processing fee. Cancellations within 7 days are non-refundable."
            }
        ]
    },
    {
        name: "Photos & Delivery",
        faqs: [
            {
                question: "How long until I receive my photos?",
                answer: "Essential packages: 5 business days. Premium: 10 business days. Enterprise: Custom timeline based on project scope."
            },
            {
                question: "In what format will I receive my photos?",
                answer: "All photos are delivered as high-resolution JPEGs via your private online gallery. RAW files available upon request for Premium+ packages."
            },
            {
                question: "Can I print the digital photos?",
                answer: "Yes! All delivered photos are print-ready at high resolution. We also offer professional printing services."
            },
            {
                question: "How long do you keep my photos?",
                answer: "Your photos are stored securely for 1 year after delivery. We recommend downloading and backing up your gallery."
            }
        ]
    },
    {
        name: "During the Shoot",
        faqs: [
            {
                question: "What should I wear?",
                answer: "Wear something comfortable that reflects your style. Avoid busy patterns and logos. Coordinate colors with family/group shots."
            },
            {
                question: "Can I bring props?",
                answer: "Absolutely! Props add personality to your photos. Let us know in advance so we can plan the best shots."
            },
            {
                question: "Can I invite guests to watch?",
                answer: "For intimate sessions, we recommend keeping it to subjects only. For events, guests are of course welcome!"
            },
            {
                question: "Do you provide hair and makeup services?",
                answer: "We can recommend trusted partners for hair and makeup. These services are arranged separately."
            }
        ]
    }
];

export default function FAQPage() {
    return (
        <main className="min-h-screen bg-white pt-32 pb-24">
            {/* Hero Section */}
            <section className="max-w-5xl mx-auto px-6 text-center mb-24">
                <h1 className="text-6xl md:text-8xl font-serif text-slate-900 mb-8 uppercase tracking-tighter">
                    Freq<span className="text-cyan-500">uently</span> <span className="text-cyan-500 italic">Asked</span>
                </h1>
                <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
                    Everything you need to know about our photography services, technology, and delivery.
                </p>
            </section>

            {/* FAQ Categories */}
            <section className="max-w-5xl mx-auto px-6 mb-32">
                <div className="grid lg:grid-cols-4 gap-12">
                    <div className="lg:col-span-1">
                        <div className="sticky top-32 space-y-4">
                            {faqCategories.map((category, idx) => (
                                <button
                                    key={idx}
                                    className="block w-full text-left px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-500 hover:bg-white hover:shadow-lg transition-all"
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-3 space-y-16">
                        {faqCategories.map((category, catIdx) => (
                            <div key={catIdx}>
                                <h2 className="text-3xl font-serif text-slate-900 mb-8 uppercase tracking-tight flex items-center gap-4">
                                    <span className="text-cyan-500">/</span> {category.name}
                                </h2>
                                <div className="space-y-4">
                                    {category.faqs.map((faq, idx) => (
                                        <details
                                            key={idx}
                                            className="group bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                                        >
                                            <summary className="flex items-center justify-between p-8 cursor-pointer text-slate-900 font-bold uppercase tracking-tight text-sm hover:text-cyan-600 transition-colors list-none">
                                                <span className="pr-4">{faq.question}</span>
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-open:rotate-180 transition-transform flex-shrink-0 shadow-sm">
                                                    <svg
                                                        className="w-4 h-4 text-cyan-500"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </summary>
                                            <div className="px-8 pb-8 text-slate-500 text-sm leading-relaxed font-medium">
                                                {faq.answer}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-100 rounded-3xl md:rounded-[3rem] p-10 md:p-16 lg:p-24 text-center relative overflow-hidden shadow-xl">
                    {/* Decorative Circles */}
                    <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />

                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-slate-900 mb-4 md:mb-6 uppercase tracking-tight relative z-10">
                        Still Have <span className="text-cyan-500 italic">Questions?</span>
                    </h2>
                    <p className="text-slate-500 mb-8 md:mb-10 text-base md:text-lg font-medium max-w-xl mx-auto relative z-10 px-2">
                        Can&apos;t find what you&apos;re looking for? Our team is ready to help with any custom requests.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex bg-cyan-500 text-white font-black uppercase py-4 md:py-5 px-8 md:px-12 rounded-full hover:bg-slate-900 transition-all shadow-xl shadow-cyan-500/20 text-[10px] tracking-widest relative z-10"
                    >
                        Contact Us
                    </Link>
                </div>
            </section>
        </main>
    );
}
