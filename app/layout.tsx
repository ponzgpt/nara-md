import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";

// Self-hosted at build time: no request to Google from the clinician's browser.
const figtree = Figtree({ subsets: ["latin"], variable: "--font" });

export const metadata: Metadata = {
  title: "Nara MD",
  description: "Searchable clinical neurophysiology guidance (EEG, EMG/NCS, evoked potentials, sleep, IONM) with cited answers.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#08171b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={figtree.variable}><body>{children}</body></html>;
}
