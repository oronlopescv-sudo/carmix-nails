// Fontes da identidade: Playfair Display (títulos) + Jost (corpo).
// Definidas num módulo próprio para reutilização sem colisões de next/font.

import { Playfair_Display, Jost } from "next/font/google";

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