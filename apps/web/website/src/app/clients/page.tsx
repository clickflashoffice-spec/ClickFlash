"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { validateAccessCode, AccessCodeResponse } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";

export default function ClientGateway() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [galleryInfo, setGalleryInfo] = useState<{ event_name: string; client_name: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const data: AccessCodeResponse = await validateAccessCode(code.trim());

            setSuccess(true);
            setGalleryInfo(data.gallery_info);

            // Redirect after showing success message
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 2000);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Invalid access code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-100/30 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-200/30 blur-[150px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-2xl shadow-cyan-900/5 transition-all hover:shadow-cyan-900/10"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center mb-10 transform hover:scale-110 transition-transform">
                        <Logo size="2xl" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter uppercase">Client Access</h1>
                    <p className="text-slate-600 font-medium text-sm leading-relaxed">
                        Enter your unique session code to access <br /> your private digital gallery.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center py-8"
                        >
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Access Granted!</h2>
                            {galleryInfo && (
                                <p className="text-slate-600 font-bold mb-2">
                                    Welcome, {galleryInfo.client_name}
                                </p>
                            )}
                            <p className="text-sm text-slate-600 font-medium italic mt-4">
                                Preparing your high-resolution memories...
                            </p>
                        </motion.div>
                    ) : (
                        <motion.form
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onSubmit={handleSubmit}
                            className="space-y-8"
                        >
                            <div className="space-y-3">
                                <label htmlFor="code" className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700 ml-1">
                                    Session Code
                                </label>
                                <div className="relative group">
                                    <input
                                        id="code"
                                        type="text"
                                        value={code}
                                        onChange={(e) => {
                                            setCode(e.target.value);
                                            setError("");
                                        }}
                                        placeholder="e.g. VIP-2026-CH"
                                        className={`w-full bg-slate-50 border-2 rounded-2xl px-6 py-5 pl-14 text-white placeholder:text-slate-300 
                                            focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all font-mono font-bold tracking-wider text-xl ${error ? "border-red-500 bg-red-50/50" : "border-slate-100"
                                            }`}
                                        autoFocus
                                    />
                                    <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors ${error ? "text-red-500" : "text-slate-300 group-focus-within:text-cyan-700"
                                        }`} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold"
                                    >
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={loading || !code}
                                className="w-full bg-slate-900 text-white font-black h-16 rounded-2xl hover:bg-cyan-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3 group text-[13px] uppercase tracking-[0.2em] shadow-xl hover:shadow-cyan-400/20"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-slate-300 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Authorize Portal
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="mt-12 pt-8 border-t border-slate-50 text-center">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                        Having issues? <Link href="/contact" className="text-cyan-700 hover:text-slate-900 underline underline-offset-4 transition-colors">Contact Expert Advisor</Link>
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
