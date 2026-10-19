import { db } from "@/lib/db";
import type { BusinessSettings } from "@prisma/client";
import { isValidTimezone } from "@/lib/tz";
import { BRAND_TIMEZONE_FALLBACK } from "@/lib/constants";

// Configurações da marca — linha única (id=1). Criada automaticamente na
// primeira leitura se o seed ainda não tiver corrido, para que o site nunca
// falhe por falta de configuração.
export async function getSettings(): Promise<BusinessSettings> {
  const row = await db.businessSettings.findUnique({ where: { id: 1 } });
  if (row) {
    if (!isValidTimezone(row.timezone)) {
      return { ...row, timezone: BRAND_TIMEZONE_FALLBACK };
    }
    return row;
  }
  return db.businessSettings.create({ data: { id: 1 } });
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length >= 20);
}