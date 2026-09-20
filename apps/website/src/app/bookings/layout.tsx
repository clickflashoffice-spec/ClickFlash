import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Book a Photography Session",
  description: "Schedule professional event, resort, or portrait photography sessions with ClickFlash.",
  path: "/bookings",
});

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
