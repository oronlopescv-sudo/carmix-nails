// Fontes da identidade (desenho do dono): Great Vibes (títulos manuscritos, o
// script fino do desenho), Playfair Display (serifada, corpo e menus) + Jost
// (só páginas funcionais). Definidas num módulo próprio para evitar colisões
// de next/font.
import { Great_Vibes, Playfair_Display, Jost } from "next/font/google";

export const greatVibes = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-greatvibes",
  weight: "400",
  display: "swap",
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});
