import React from "react";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark" | "white" | "transparent";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  variant = "dark",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  // Choose logo based on variant:
  // - dark/white (default): logo.png (white bg, good for dark headers)
  // - light/transparent: logo-trans.png (transparent bg, good for light backgrounds)
  const logoSrc =
    variant === "light" || variant === "transparent"
      ? "/logo-cf-v4.png"
      : "/logo-cf-v4.png";

  return (
    <img
      src={logoSrc}
      alt="ClickFlash"
      className={`${sizeClasses[size]} w-auto object-contain ${className}`}
    />
  );
};

export default Logo;
