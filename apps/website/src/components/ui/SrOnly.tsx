"use client";

import { ReactNode } from "react";

/**
 * Screen Reader Only Component
 * 
 * Visually hides content while keeping it accessible to assistive technologies.
 * Use for providing additional context to screen reader users.
 * 
 * @example
 * ```tsx
 * <button>
 *   <Icon />
 *   <SrOnly>Close menu</SrOnly>
 * </button>
 * ```
 */
interface SrOnlyProps {
  children: ReactNode;
  as?: "span" | "div" | "p" | "label";
}

export function SrOnly({ children, as: Component = "span" }: SrOnlyProps) {
  const classes = "sr-only";
  
  if (Component === "div") {
    return <div className={classes}>{children}</div>;
  }
  if (Component === "p") {
    return <p className={classes}>{children}</p>;
  }
  if (Component === "label") {
    return <label className={classes}>{children}</label>;
  }
  return <span className={classes}>{children}</span>;
}

/**
 * Visually Hidden Component with focus support
 * 
 * Content is hidden visually but can be revealed on focus (e.g., skip links).
 */
interface VisuallyHiddenProps {
  children: ReactNode;
  focusable?: boolean;
  className?: string;
}

export function VisuallyHidden({ 
  children, 
  focusable = false,
  className = ""
}: VisuallyHiddenProps) {
  return (
    <span
      className={`
        absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0
        ${focusable 
          ? 'focus:static focus:w-auto focus:h-auto focus:m-0 focus:overflow-visible focus:whitespace-normal' 
          : ''
        }
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export default SrOnly;
