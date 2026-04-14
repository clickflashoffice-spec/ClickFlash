"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslation } from "@/lib/translations";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const getNavLinks = (lang: string) => [
  { name: getTranslation(lang, "nav_home"), href: "/" },
  { name: getTranslation(lang, "nav_services"), href: "/services" },
  { name: getTranslation(lang, "nav_careers"), href: "/careers" },
  { name: getTranslation(lang, "nav_blog"), href: "/blog" },
  { name: getTranslation(lang, "nav_gallery"), href: "/gallery" },
  { name: getTranslation(lang, "nav_portfolio"), href: "/portfolio" },
  { name: getTranslation(lang, "nav_contact"), href: "/contact" },
];

export function Navbar() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(0);
  const pathname = usePathname();
  const navLinks = getNavLinks(language);

  // Scroll handling with performance optimization
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const maxScroll = 300;
          setScrollOpacity(Math.min(scrollY / maxScroll, 1));
          ticking = false;
        });
        ticking = true;
      }
    };
    // Initial check
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  const isHome = pathname === "/" || pathname === "";
  const scrolled = scrollOpacity > 0.05;

  return (
    <nav
      id="main-navbar"
      className={cn(
        "fixed top-0 left-0 z-[100] w-full border-none transition-all duration-700 ease-out",
        "bg-white/95 py-0.5 shadow-sm backdrop-blur-md"
      )}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="container mx-auto flex items-center justify-between px-2 sm:px-4 lg:px-6">
        {/* Logo Section */}
        <Link
          href="/"
          className="group flex transform items-center gap-2 transition-transform duration-300 hover:scale-105"
          aria-label="ClickFlash Home"
        >
          <Logo variant="light" size="xl" />
        </Link>

        {/* Status Badge */}
        <a
          href="https://www.pixelholiday.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "ml-2 flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[7px] font-bold tracking-widest text-slate-400 uppercase transition-all duration-500 hover:scale-105 hover:border-cyan-500 hover:text-cyan-500 md:ml-4 md:px-3 md:text-[8px]"
          )}
        >
          <span className="hidden sm:inline">Powered by </span>PixelHoliday
        </a>

        {/* Navigation Links */}
        <div className="hidden items-center gap-4 lg:flex xl:gap-7">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const isExternalApp = link.href === "/gallery" || link.href === "/manage";

            return (
              <Link
                key={link.name}
                href={link.href}
                prefetch={isExternalApp ? false : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "transform text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-500 hover:scale-105 hover:text-[#06b6d4] active:scale-95 xl:text-[11px]",
                  "text-slate-800",
                  isActive && "text-[#06b6d4]"
                )}
              >
                {link.name}
              </Link>
            );
          })}
          <Link
            id="nav-book-button"
            href="/bookings"
            className="ml-2 rounded-full bg-cyan-400 px-6 py-2.5 text-[10px] font-black tracking-widest text-white uppercase shadow-lg transition-all hover:scale-105 hover:bg-slate-900 hover:shadow-cyan-400/40 xl:text-[11px]"
          >
            {getTranslation(language, "btn_book")}
          </Link>
        </div>

        {/* Mobile Menu Interaction */}
        <button
          id="mobile-menu-toggle"
          className={cn(
            "rounded-lg p-2 transition-all duration-700 hover:bg-black/5 lg:hidden",
            "text-slate-900"
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close main menu" : "Open main menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
        >
          {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <div id="mobile-navigation">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute inset-x-0 top-full overflow-hidden border-t border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] lg:hidden"
            >
              <div className="container mx-auto flex flex-col gap-7 px-6 py-12">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-xl font-black tracking-widest text-slate-800 uppercase transition-colors hover:text-[#06b6d4]"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="my-2 h-px bg-slate-100" />
                <Link
                  href="/bookings"
                  className="w-full rounded-2xl bg-cyan-400 py-5 text-center font-black tracking-widest text-white uppercase shadow-xl shadow-cyan-400/30 transition-transform active:scale-95"
                  onClick={() => setIsOpen(false)}
                >
                  {getTranslation(language, "btn_book")}
                </Link>

                <div className="mt-4 flex flex-col items-center pt-10">
                  <a
                    href="https://www.pixelholiday.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-[10px] font-black tracking-widest text-slate-400 uppercase transition-all hover:bg-slate-50"
                  >
                    Powered by PixelHoliday
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
