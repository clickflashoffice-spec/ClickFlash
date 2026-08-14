import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";
import { InstagramFeed } from "@/components/sections/InstagramFeed";

export const metadata: Metadata = createPageMetadata({
  title: "Careers & Photographer Jobs",
  description: "Join ClickFlash Photography's global team of resort and event photographers across premier destinations.",
  path: "/careers",
});

export default function CareersPage() {
    return (
        <main className="min-h-screen bg-white pt-32 pb-24">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl">
                    <h1 className="text-6xl md:text-8xl font-black mb-12 text-slate-900 uppercase tracking-tighter leading-none">
                        Join Our <span className="text-cyan-700">Team</span>
                    </h1>
                    <p className="text-2xl text-slate-600 font-bold mb-16 max-w-2xl leading-tight">
                        Are you a passionate photographer or creative professional? We&apos;re always looking for talented individuals to join our global team.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase tracking-widest text-slate-600">Why ClickFlash?</h2>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Work at the intersection of luxury hospitality and cutting-edge photography.
                                We provide our team with pro-grade equipment, innovative offline tools, and a global canvas to showcase their talent.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-12 rounded-[2.5rem] border border-slate-100 shadow-xl">
                            <h3 className="text-xl font-black text-slate-900 mb-4 uppercase">Open Roles</h3>
                            <ul className="space-y-4">
                                {['Resort Photographer', 'Quality Editor', 'Operations Manager'].map(role => (
                                    <li key={role} className="flex items-center justify-between group cursor-pointer border-b border-slate-200 pb-3">
                                        <span className="font-bold text-slate-700 group-hover:text-cyan-700 transition-colors uppercase tracking-tight">{role}</span>
                                        <span className="text-[10px] font-black bg-cyan-100 text-cyan-700 px-2 py-1 rounded uppercase tracking-widest">Apply</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* INSTAGRAM FEED */}
            <InstagramFeed
                title={<>Behind the <span className="text-cyan-700">Scenes</span></>}
                subtitle="Company Culture"
            />
        </main>
    );
}
