import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono, Inter } from "next/font/google";
import { TopNav } from "./_components/TopNav";
import { ThemeScript } from "./_components/ThemeScript";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap", weight: ["400", "500", "600", "700"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", display: "swap", weight: ["400", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "CLAWPIPES · permissionless launchpad for Openclaw channels",
  description: "Permissionless launchpad for Openclaw channels and communities.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7FAFD" },
    { media: "(prefers-color-scheme: dark)", color: "#030F1C" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <div className="grid-bg" aria-hidden />
        <TopNav />
        <main className="relative" style={{ zIndex: 1 }}>{children}</main>
      </body>
    </html>
  );
}
