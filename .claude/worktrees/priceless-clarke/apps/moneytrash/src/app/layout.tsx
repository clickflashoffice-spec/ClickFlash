import "./globals.css";

export const metadata = {
  title: "MoneyTrash Transfer - Secure Cloud Upload",
  description: "Professional photography upload gateway for creating client galleries and backing up orders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
