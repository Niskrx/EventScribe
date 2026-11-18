import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventScribe — Dynamic Academic Event Report Generator",
  description: "AI-assisted academic event report generator with dynamic format understanding and fact-grounded drafting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
