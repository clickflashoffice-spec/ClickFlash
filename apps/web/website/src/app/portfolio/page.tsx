import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";
import { PortfolioClient } from "./PortfolioClient";

export const metadata: Metadata = createPageMetadata({
  title: "Photography Portfolio - Weddings, Resorts & Events",
  description: "Browse ClickFlash's professional photography portfolio featuring weddings, resort photography, portraits, and events captured across Tunisia and Djerba.",
  path: "/portfolio",
});

export default function PortfolioPage() {
    return <PortfolioClient />;
}
