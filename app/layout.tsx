import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nara MD",
  description: "Searchable clinical neurophysiology guidance — EEG, EMG/NCS, evoked potentials, sleep and IONM — with cited answers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
