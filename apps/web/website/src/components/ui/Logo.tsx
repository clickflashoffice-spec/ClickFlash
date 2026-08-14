import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark" | "white" | "transparent";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "hero";
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = "dark", size = "md" }) => {
  // Width-only Tailwind classes — height is computed from the image's intrinsic
  // 19:7 aspect ratio (380×140 source). Don't combine with `w-auto` or the
  // explicit width gets overridden by the intrinsic image width.
  const sizeClasses = {
    sm: "w-24 md:w-28",     // ~96px → ~112px
    md: "w-28 md:w-36",     // ~112px → ~144px  ← Navbar default lives here
    lg: "w-36 md:w-44",     // ~144px → ~176px
    xl: "w-40 md:w-52",     // ~160px → ~208px (was 224→320)
    "2xl": "w-56 md:w-72",  // ~224px → ~288px (was 288→384)
    "3xl": "w-[200px] sm:w-[260px] md:w-[350px] lg:w-[480px]",
    "4xl": "w-[280px] md:w-[400px] lg:w-[550px]",
    hero: "w-[400px] md:w-[650px]",
  };

  // Intrinsic dimensions handed to next/image so the optimizer can pick the
  // right srcset and avoid CLS. Keep aspect ratio matching `/logo-cf-v4.png`.
  const widthClasses = {
    sm: 112,
    md: 144,
    lg: 176,
    xl: 208,
    "2xl": 288,
    "3xl": 480,
    "4xl": 550,
    hero: 650,
  };

  const heightClasses = {
    sm: 41,
    md: 53,
    lg: 65,
    xl: 77,
    "2xl": 106,
    "3xl": 177,
    "4xl": 203,
    hero: 240,
  };

  // Unified final logo
  const logoSrc = "/logo-cf-v4.png";

  // Mark as variant-aware for future light/dark/transparent swaps.
  // Currently `variant` is unused at the asset level (single PNG); kept on
  // the API to avoid a breaking change for callers (Footer, Navbar, etc.)
  void variant;

  return (
    <Link href="/" className={`group flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="ClickFlash"
        width={widthClasses[size]}
        height={heightClasses[size]}
        className={`${sizeClasses[size]} h-auto object-contain`}
        priority
        sizes="(max-width: 768px) 144px, 208px"
      />
    </Link>
  );
};

export default Logo;
