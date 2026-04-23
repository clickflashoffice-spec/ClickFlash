
import { fetchWebsiteSettings } from "@/lib/settings";
import ContactPageContent from "./ContactPageContent";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ContactPage() {
  const settings = await fetchWebsiteSettings();

  return <ContactPageContent settings={settings} />;
}