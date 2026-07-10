import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "License Verification & Activation Portal | ClickFlash Studio",
  description:
    "Verify, inspect, and activate your ClickFlash Studio license key. Check your plan tier, master portal quota, hardware binding status, and expiration.",
  openGraph: {
    title: "License Verification & Activation Portal | ClickFlash Studio",
    description:
      "Verify, inspect, and activate your ClickFlash Studio license key online.",
    url: "https://clickflash.studio/license",
    siteName: "ClickFlash Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "License Verification & Activation Portal | ClickFlash Studio",
    description:
      "Verify, inspect, and activate your ClickFlash Studio license key online.",
  },
};

export default function LicenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
