import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Our Clients & Partners",
  description: "Discover the luxury hotels, international resorts, and premier event organizers who trust ClickFlash for high-volume, premium photography.",
  path: "/clients",
});

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
