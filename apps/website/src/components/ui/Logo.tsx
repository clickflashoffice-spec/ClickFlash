import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark" | "white" | "transparent";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "hero";
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = "dark", size = "md" }) => {
  const sizeClasses = {
    sm: "w-28 md:w-36",
    md: "w-36 md:w-48",
    lg: "w-48 md:w-64",
    xl: "w-56 md:w-80",
    "2xl": "w-72 md:w-96",
    "3xl": "w-[200px] sm:w-[260px] md:w-[350px] lg:w-[480px]",
    "4xl": "w-[280px] md:w-[400px] lg:w-[550px]",
    hero: "w-[400px] md:w-[650px]",
  };

  const widthClasses = {
    sm: 150,
    md: 200,
    lg: 280,
    xl: 380,
    "2xl": 500,
    "3xl": 650,
    "4xl": 850,
    hero: 1100,
  };

  const heightClasses = {
    sm: 64,
    md: 80,
    lg: 100,
    xl: 140,
    "2xl": 180,
    "3xl": 240,
    "4xl": 320,
    hero: 400,
  };

  // Unified final logo, cache-busted filename
  const logoSrc = "/logo-cf-v4.png";

  return (
    <Link href="/" className={`group flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="ClickFlash"
        width={widthClasses[size]}
        height={heightClasses[size]}
        className={`${sizeClasses[size]} w-auto object-contain`}
        priority
      />
    </Link>
  );
};

export default Logo;
