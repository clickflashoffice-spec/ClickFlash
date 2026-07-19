import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Sparkles, Clock, Globe, Award } from 'lucide-react';
import { shareToFacebook, shareToTwitter, shareViaEmail, copyToClipboard, generateShareableUrl } from '../../utils/shareUtils';

export interface UpsellEngineProps {
    galleryId?: string;
    photoId?: string;
    onUnlock?: (code: string, percentOff: number) => void;
    className?: string;
}

const LANGUAGES = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
    { code: 'fr', label: 'FR' },
    { code: 'de', label: 'DE' },
    { code: 'ar', label: 'AR' },
];

const STORAGE_KEY_UNLOCKED = 'clickflash_share15_unlocked';
const STORAGE_KEY_EXPIRES = 'clickflash_share15_expires';
const DISCOUNT_DURATION_SEC = 15 * 60; // 15 minutes

export const UpsellEngine: React.FC<UpsellEngineProps> = ({
    galleryId = 'default',
    photoId,
    onUnlock,
    className = '',
}) => {
    const { t, i18n } = useTranslation();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState(DISCOUNT_DURATION_SEC);
    const [copied, setCopied] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Initialize state from local storage
    useEffect(() => {
        const unlocked = localStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true';
        if (unlocked) {
            setIsUnlocked(true);
            const expiresStr = localStorage.getItem(STORAGE_KEY_EXPIRES);
            if (expiresStr) {
                const expiresAt = parseInt(expiresStr, 10);
                const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
                setTimeLeft(remaining > 0 ? remaining : 0);
            }
            if (onUnlock) {
                onUnlock('SHARE15', 15);
            }
        }
    }, [onUnlock]);

    // Timer countdown loop
    useEffect(() => {
        if (!isUnlocked || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isUnlocked, timeLeft]);

    const handleUnlockAction = useCallback(() => {
        if (isUnlocked) return;

        const now = Date.now();
        const expiresAt = now + DISCOUNT_DURATION_SEC * 1000;

        localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');
        localStorage.setItem(STORAGE_KEY_EXPIRES, expiresAt.toString());

        setIsUnlocked(true);
        setTimeLeft(DISCOUNT_DURATION_SEC);
        setShowConfetti(true);

        setTimeout(() => setShowConfetti(false), 4000);

        if (onUnlock) {
            onUnlock('SHARE15', 15);
        }
    }, [isUnlocked, onUnlock]);

    const handleCopy = async () => {
        const url = generateShareableUrl(galleryId, photoId);
        await copyToClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        handleUnlockAction();
    };

    const handleSocialShare = (platform: 'fb' | 'tw' | 'email') => {
        const url = generateShareableUrl(galleryId, photoId);
        const options = {
            url,
            title: 'My ClickFlash Photo Gallery',
            description: 'Check out these amazing photos from ClickFlash!',
        };

        if (platform === 'fb') shareToFacebook(options);
        if (platform === 'tw') shareToTwitter(options);
        if (platform === 'email') shareViaEmail(options);

        handleUnlockAction();
    };

    const handleLanguageChange = (code: string) => {
        void i18n.changeLanguage(code);
    };

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    const isRtl = i18n.language === 'ar';

    return (
        <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className={`relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-slate-950 p-4 md:p-6 shadow-2xl transition-all ${className}`}
        >
            {/* Confetti Animation Particles */}
            <AnimatePresence>
                {showConfetti && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
                        {Array.from({ length: 18 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    opacity: 1,
                                    scale: 0.5,
                                    x: '50%',
                                    y: '50%',
                                }}
                                animate={{
                                    opacity: 0,
                                    scale: [1, 1.4, 0.8],
                                    x: `${(Math.random() - 0.5) * 350}%`,
                                    y: `${(Math.random() - 0.5) * 350}%`,
                                    rotate: Math.random() * 360,
                                }}
                                transition={{ duration: 2.2, ease: 'easeOut', delay: i * 0.05 }}
                                className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full"
                                style={{
                                    backgroundColor: ['#F59E0B', '#10B981', '#06B6D4', '#EC4899', '#8B5CF6'][i % 5],
                                }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Language Switcher & Badge Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-400 border border-amber-500/40">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                        {isUnlocked ? t('upsell.unlockedBadge') : t('upsell.badge')}
                    </span>
                </div>

                {/* Multi-language Selector */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    <div className="flex items-center gap-1">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`px-2 py-0.5 text-xs font-bold rounded-lg transition-colors ${
                                    i18n.language.startsWith(lang.code)
                                        ? 'bg-cyan-500 text-black shadow'
                                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {!isUnlocked ? (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                            {t('upsell.title')}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                            {t('upsell.subtitle')}
                        </p>
                    </div>

                    {/* Action Row */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleUnlockAction}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95 flex-1 sm:flex-none"
                        >
                            <Share2 className="h-4 w-4" />
                            <span>{t('upsell.button')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => void handleCopy()}
                            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800/80 px-4 py-3 text-sm font-bold text-slate-200 border border-white/10 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                            <span>{copied ? t('upsell.linkCopied') : t('upsell.copyLink')}</span>
                        </button>
                    </div>

                    {/* Social Quick Share */}
                    <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                        <span className="font-semibold">{t('upsell.shareOn')}</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleSocialShare('fb')}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 font-bold border border-blue-500/30 transition-colors"
                            >
                                Facebook
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSocialShare('tw')}
                                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 text-sky-400 font-bold border border-sky-500/30 transition-colors"
                            >
                                Twitter
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSocialShare('email')}
                                className="px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 font-bold border border-white/10 transition-colors"
                            >
                                Email
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Unlocked State */
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 p-4 rounded-xl border border-amber-500/40">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                <Award className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                                    {t('upsell.unlockedTitle')}
                                </span>
                                <p className="text-sm font-semibold text-slate-200 mt-0.5">
                                    {t('upsell.appliedMessage')}
                                </p>
                            </div>
                        </div>

                        {/* Countdown Pill */}
                        <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 border border-white/10">
                            <Clock className="h-4 w-4 text-cyan-400 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-400">{t('upsell.expiresIn')}</span>
                            <span className="font-mono text-sm font-black text-cyan-400 tracking-wider">
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default UpsellEngine;
