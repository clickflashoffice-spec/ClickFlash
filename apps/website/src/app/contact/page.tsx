
import type { Metadata } from "next";
import { fetchWebsiteSettings } from "@/lib/settings";
import ContactPageContent from "./ContactPageContent";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Us",
  description: "Get in touch with ClickFlash Photography for resort contracts, event coverage, or booking inquiries.",
  path: "/contact",
});

export const revalidate = false; // Fully static for Cloudflare Pages

export default async function ContactPage() {
  const settings = await fetchWebsiteSettings();

  return <ContactPageContent settings={settings} />;
}
