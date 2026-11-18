import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventScribe",
  description: "Dynamic academic event report generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
