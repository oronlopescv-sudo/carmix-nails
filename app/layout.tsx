import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/mail";
import { playfair, jost } from "@/components/layout/fonts";

const FALLBACK_BRAND = "Carmix Nails";

export async function generateMetadata(): Promise<Metadata> {
  let brand = FALLBACK_BRAND;
  let seoTitle: string | null = null;
  let seoDescription: string | null = null;
  try {
    const s = await getSettings();
    brand = s.brandName || FALLBACK_BRAND;
    seoTitle = s.seoTitle;
    seoDescription = s.seoDescription;
  } catch {
    // base de dados indisponível no build → metadados de reserva
  }
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seoTitle || `${brand} — Marcação online`, template: `%s | ${brand}` },
    description:
      seoDescription ||
      `${brand}: unhas de gel com fibras, banho de gel, pedicure e decorações. Marque a sua hora online.`,
    applicationName: brand,
  };
}

export const viewport: Viewport = {
  themeColor: "#850b36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${playfair.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}