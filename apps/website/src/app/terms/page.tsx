import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - ClickFlash Photography",
  description: "Terms and conditions for using ClickFlash Photography services.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-6xl md:text-7xl font-serif text-slate-900 mb-12 uppercase tracking-tighter">
          Terms of <span className="text-cyan-500">Service</span>
        </h1>
        <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:uppercase prose-headings:tracking-tight prose-a:text-cyan-500 prose-a:no-underline hover:prose-a:underline">
          <p className="text-slate-400 mb-12 font-bold uppercase tracking-widest text-[10px] pb-8 border-b border-slate-50">Last updated: February 1, 2026</p>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6 font-serif uppercase tracking-tight">1. Agreement to Terms</h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              By accessing or using ClickFlash Photography&rsquo;s services, you agree to be bound by these Terms of Service.
              If you disagree with any part of these terms, you may not access our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6 font-serif uppercase tracking-tight">2. Services</h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              ClickFlash Photography provides professional photography services, photo management tools, and related digital services.
              We reserve the right to withdraw or amend our services without notice.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6 font-serif uppercase tracking-tight">3. Booking and Cancellation</h2>
            <p className="text-slate-600 mb-6 font-medium">
              All bookings are subject to availability and confirmation. Cancellation policies vary by service type and will be
              communicated at the time of booking.
            </p>
            <ul className="text-slate-600 list-disc pl-6 space-y-3 font-medium">
              <li>Weddings and large events: 30 days notice required for cancellation</li>
              <li>Portrait sessions: 48 hours notice required</li>
              <li>Corporate events: 14 days notice required</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6 font-serif uppercase tracking-tight">4. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              All photographs and media remain the intellectual property of ClickFlash Photography until full payment is received
              and rights are transferred as specified in your service agreement.
            </p>
          </section>

          <section className="mt-20 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
            <h2 className="text-2xl text-slate-900 mb-6 font-serif uppercase tracking-tight">5. Contact</h2>
            <p className="text-slate-600 font-medium">
              For questions about these Terms, please contact our legal team at:
              <br />
              <a href="mailto:legal@clickflash.photography" className="inline-block mt-4 text-cyan-600 font-bold">
                legal@clickflash.photography
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
