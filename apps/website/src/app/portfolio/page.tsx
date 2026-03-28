import type { Metadata } from "next";
import { PortfolioClient } from "./PortfolioClient";

export const metadata: Metadata = {
    title: "Photography Portfolio | ClickFlash - Weddings, Resorts & Events",
    description: "Browse ClickFlash's professional photography portfolio featuring weddings, resort photography, portraits, and events captured across Tunisia and Djerba.",
    keywords: ["photography portfolio", "wedding photos Tunisia", "resort photography", "Djerba photographer", "event photography"],
    openGraph: {
        title: "ClickFlash Photography Portfolio",
        description: "Professional photography portfolio featuring weddings, resorts, portraits, and events captured across Tunisia.",
        type: "website",
    },
};

export default function PortfolioPage() {
    return <PortfolioClient />;
}
