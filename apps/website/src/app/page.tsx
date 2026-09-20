
import type { Metadata } from "next";
import { fetchWebsiteSettings } from "@/lib/settings";
import HomePageContent from "./HomePageContent";
import { createPageMetadata, BRAND } from "./metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Home",
  description: BRAND.description,
  path: "/",
});

export const revalidate = false; // Fully static for Cloudflare Pages

export default async function Home() {
  const settings = await fetchWebsiteSettings();

  return <HomePageContent settings={settings} />;
}
