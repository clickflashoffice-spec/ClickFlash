
import { fetchWebsiteSettings } from "@/lib/settings";
import HomePageContent from "./HomePageContent";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const settings = await fetchWebsiteSettings();

  return <HomePageContent settings={settings} />;
}
