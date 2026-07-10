import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Professional Photography Services",
  description: "Explore ClickFlash photography services including luxury resort coverage, weddings, corporate events, and water park photography.",
  path: "/services",
});

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
