"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getTranslation } from "@/lib/translations";

export function TopBar() {
    const { language, setLanguage } = useLanguage();

    const languages: { code: Language; label: string; flag: string }[] = [
        { code: 'en', label: 'EN', flag: '🇬🇧' },
        { code: 'gr', label: 'GR', flag: '🇬🇷' },
        { code: 'es', label: 'ES', flag: '🇪🇸' },
        { code: 'ar', label: 'AR', flag: '🇦🇪' },
    ];

    return (
        <div className="bg-cyan-700 text-white py-2 px-4 text-xs font-medium hidden md:block">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <a href="mailto:info@clicketflash.com" className="flex items-center gap-2 hover:text-cyan-100 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                        <span>info@clicketflash.com</span>
                    </a>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{getTranslation(language, 'top_location')}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 xl:gap-6">
                    <a href="tel:+1234567890" className="flex items-center gap-2 hover:text-cyan-100 transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                        <span>+1 (234) 567-890</span>
                    </a>
                    <div className="flex items-center gap-3">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code)}
                                className={`flex items-center gap-1 transition-all hover:scale-110 ${language === lang.code ? 'font-black scale-110' : 'opacity-70 hover:opacity-100'}`}
                                title={lang.label}
                            >
                                <span>{lang.flag}</span>
                                <span className="text-[10px]">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
