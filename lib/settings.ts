import { db } from "@/lib/db";
import type { BusinessSettings } from "@prisma/client";
import { isValidTimezone } from "@/lib/tz";
import { BRAND_TIMEZONE_FALLBACK } from "@/lib/constants";

// Configurações da marca — linha única (id=1). Criada automaticamente na
// primeira leitura se o seed ainda não tiver corrido. Com a base de dados
// inalcançável ou sem tabelas (ex.: migrações por correr no primeiro deploy),
// devolve predefinições em vez de lançar — a causa real fica no log e as
// páginas públicas continuam de pé com conteúdo mínimo honesto.

// Espelha os @default do modelo BusinessSettings (prisma/schema.prisma).
const DEFAULT_SETTINGS: BusinessSettings = {
  id: 1,
  brandName: "Carmix Nails",
  ownerName: "Carmo Gomes",
  tagline: null,
  heroTitle: null,
  heroSubtitle: null,
  heroImageUrl: null,
  aboutTitle: null,
  aboutText: null,
  aboutImageUrl: null,
  phone: null,
  whatsApp: null,
  email: null,
  address: null,
  city: null,
  mapsUrl: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  timezone: "Atlantic/Cape_Verde",
  currency: "CVE",
  slotIntervalMinutes: 15,
  minLeadMinutes: 60,
  maxLeadDays: 60,
  autoConfirm: false,
  bookingEnabled: true,
  minCancelHours: 24,
  allowReschedule: true,
  cancelPolicyText: null,
  servicesNote: null,
  seoTitle: null,
  seoDescription: null,
  updatedAt: new Date(),
};

export async function getSettings(): Promise<BusinessSettings> {
  try {
    let row = await db.businessSettings.findUnique({ where: { id: 1 } });
    if (!row) {
      try {
        row = await db.businessSettings.create({ data: { id: 1 } });
      } catch (e) {
        // Primeiro arranque com pedidos em paralelo: o segundo create colide
        // com P2002 — relê a linha que o primeiro pedido criou.
        if ((e as { code?: string }).code === "P2002") {
          row = await db.businessSettings.findUnique({ where: { id: 1 } });
        } else {
          throw e;
        }
      }
    }
    if (!row) throw new Error("businessSettings indisponível");
    if (!isValidTimezone(row.timezone)) {
      return { ...row, timezone: BRAND_TIMEZONE_FALLBACK };
    }
    return row;
  } catch (e) {
    console.error("[carmix] getSettings sem base de dados — a servir predefinições:", e);
    return DEFAULT_SETTINGS;
  }
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length >= 20);
}