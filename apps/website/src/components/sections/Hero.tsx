"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useDeviceCapabilities, useLazyLoad } from "@/hooks/usePerformance";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface HeroProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
}

/**
 * Hero Section Component
 * 
 * Features:
 * - Responsive background image with Next.js Image optimization
 * - Reduced motion support for accessibility
 * - Lazy loading for below-fold content
 * - Performance-optimized animations
 */
export function Hero({ title, subtitle, imageUrl }: HeroProps) {
  const defaultImage = "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2938&auto=format&fit=crop";
  const { prefersReducedMotion, shouldLoadHeavyAnimations } = useDeviceCapabilities();
  const { ref: heroRef, isVisible } = useLazyLoad<HTMLElement>();

  // Animation variants based on device capabilities
  const containerVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1] as const,
            staggerChildren: 0.2,
          },
        },
      };

  const itemVariants = prefersReducedMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
          },
        },
      };

  return (
    <ErrorBoundary>
      <section
        ref={heroRef}
        className="relative h-screen w-full flex items-center justify-center overflow-hidden"
        aria-labelledby="hero-title"
      >
        {/* Subtle Animated Ken Burns Background */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes ken-burns {
            0% { transform: scale(1); }
            100% { transform: scale(1.15); }
          }
        `}} />
        <div 
          className="absolute inset-0 z-0"
          style={{ animation: 'ken-burns 30s ease-out infinite alternate' }}
        >
          <Image
            src={imageUrl || defaultImage}
            alt=""
            fill
            className="object-cover"
            priority
            quality={90}
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzVCNzhAP0JQX1hUXl5QVF1hX15fX15fY2RlYmtjbG1wcGJiYv/2wBDAR..."
          />
          {/* High Contrast Gradient overlay for text readability */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-900/90"
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            variants={containerVariants}
          >
            <motion.span
              variants={itemVariants}
              className="block text-cyan-400 text-sm sm:text-base md:text-xl lg:text-2xl tracking-[0.3em] md:tracking-[0.5em] uppercase font-black mb-4 md:mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] px-4"
            >
              {subtitle || "Captured Moments"}
            </motion.span>
            
            <motion.h1
              id="hero-title"
              variants={itemVariants}
              className="text-5xl sm:text-7xl md:text-9xl lg:text-[10rem] xl:text-[12rem] font-sans font-black text-white mb-6 md:mb-10 leading-[0.85] tracking-tighter drop-shadow-2xl px-2 uppercase mix-blend-overlay"
            >
              {title ? (
                // SECURITY: title comes from CMS/build-time config, not user input.
                <span dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br />') }} />
              ) : (
                <>
                  Creating<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Smiles</span>
                </>
              )}
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row items-center justify-center gap-6 mt-12"
            >
              <div className="flex flex-col items-center gap-3">
                <Link
                  href="/bookings"
                  className="group relative px-8 md:px-12 py-4 md:py-5 bg-cyan-700 text-white font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[12px] md:text-[13px] rounded-full hover:bg-cyan-700 transition-all duration-300 shadow-2xl shadow-cyan-400/30 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 focus:ring-offset-4 focus:ring-offset-transparent"
                  aria-label="Book a professional photoshoot"
                >
                  <span className="relative z-10">Book Now</span>
                  {/* Hover effect */}
                  <span className="absolute inset-0 rounded-full bg-[#0B111F]/20 scale-0 group-hover:scale-100 transition-transform duration-300" aria-hidden="true" />
                </Link>
              </div>
              
              <Link
                href="/portfolio"
                className="group px-8 md:px-12 py-4 md:py-5 bg-[#0B111F]/10 backdrop-blur-md border-2 border-white/20 text-white font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[12px] md:text-[13px] rounded-full hover:bg-[#0B111F] hover:text-[#0B111F] transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/50 focus:ring-offset-4 focus:ring-offset-transparent"
                aria-label="View our photography portfolio"
              >
                Portfolio
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator - only on capable devices */}
        {shouldLoadHeavyAnimations() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
            aria-hidden="true"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-2"
            >
              <motion.div className="w-1.5 h-2.5 bg-[#0B111F]/60 rounded-full" />
            </motion.div>
          </motion.div>
        )}
      </section>
    </ErrorBoundary>
  );
}

export default Hero;
