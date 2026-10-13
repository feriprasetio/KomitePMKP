import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Komite PMKP",
  description: "Dashboard pengelolaan dokumen Peningkatan Mutu dan Keselamatan Pasien.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
