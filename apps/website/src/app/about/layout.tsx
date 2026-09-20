import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "About Us",
  description: "Learn about ClickFlash Photography established in 2008, specializing in resort, event, and wedding photography across premier destinations.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
