import { Metadata } from "next";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Our commitment to protecting your privacy and personal information at ClickFlash Photography.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-6xl md:text-7xl font-serif text-slate-900 mb-12 uppercase tracking-tighter">
          Privacy <span className="text-cyan-700">Policy</span>
        </h1>
        <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:uppercase prose-headings:tracking-tight prose-a:text-cyan-700 prose-a:no-underline hover:prose-a:underline">
          <p className="text-slate-600 mb-12 font-bold uppercase tracking-widest text-[10px] pb-8 border-b border-slate-50">Last updated: February 1, 2026</p>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              ClickFlash Photography (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6 font-serif uppercase tracking-tight">2. Information We Collect</h2>
            <p className="text-slate-600 mb-6 font-medium">We may collect the following types of information:</p>
            <ul className="text-slate-600 list-disc pl-6 space-y-3 font-medium">
              <li>Personal identification information (name, email address, phone number)</li>
              <li>Event details and preferences</li>
              <li>Photos and media you upload to our platform</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl text-slate-900 mb-6 font-serif uppercase tracking-tight">3. How We Use Your Information</h2>
            <p className="text-slate-600 mb-6 font-medium">We use the information we collect to:</p>
            <ul className="text-slate-600 list-disc pl-6 space-y-3 font-medium">
              <li>Provide and maintain our services</li>
              <li>Process your bookings and inquiries</li>
              <li>Communicate with you about your events</li>
              <li>Improve our website and services</li>
              <li>Send promotional communications (with your consent)</li>
            </ul>
          </section>

          <section className="mt-20 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
            <h2 className="text-2xl text-slate-900 mb-6 font-serif uppercase tracking-tight">4. Contact Us</h2>
            <p className="text-slate-600 font-medium">
              If you have any questions about this Privacy Policy, please contact our legal team at:
              <br />
              <a href="mailto:privacy@clickflash.photography" className="inline-block mt-4 text-cyan-700 font-bold">
                privacy@clickflash.photography
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
