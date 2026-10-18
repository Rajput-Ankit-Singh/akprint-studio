import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paperloop Studio | Print-ready documents",
  description: "A privacy-first, browser-based document and photo print studio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
