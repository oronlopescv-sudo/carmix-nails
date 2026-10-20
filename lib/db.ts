import { PrismaClient } from "@prisma/client";
import { normalizeDatabaseUrl } from "@/lib/db-url";

// Singleton do Prisma — evita múltiplas ligações em desenvolvimento (HMR)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// TLS automático para bases de dados remotas (Supabase/Neon exigem-no)
const datasourceUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
