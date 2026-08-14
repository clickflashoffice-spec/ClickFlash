import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing & Packages",
  description: "Transparent pricing and flexible photography packages tailored for resorts, private events, weddings, and high-volume guest attractions.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
