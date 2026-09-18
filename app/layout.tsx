import "./globals.css";
import type { Metadata } from "next";
import { Figtree } from "next/font/google";

// Self-hosted at build time: no request to Google from the clinician's browser.
const figtree = Figtree({ subsets: ["latin"], variable: "--font" });

export const metadata: Metadata = {
  title: "Nara MD — clinical neurophysiology guidance, cited",
  description: "Society guidance and literature for EEG, EMG/NCS, evoked potentials, sleep and IONM, answered with citations while you finish the report.",
  icons: { icon: "/icon.svg" },
  metadataBase: new URL("https://naramd.technoir.cloud"),
  openGraph: { title: "Nara MD", description: "The guideline, before the report is signed.", type: "website" },
};

// Runs before first paint so a stored dark preference never flashes white (and vice versa).
const THEME = `try{document.documentElement.dataset.theme=localStorage.getItem("nara.theme")||"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={figtree.variable} data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}</body>
    </html>
  );
}
