import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/mail";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/servicos",
    "/agendar",
    "/sobre",
    "/galeria",
    "/contactos",
    "/termos",
    "/politica-de-privacidade",
  ].map((path) => ({ url: base + path, changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 }));

  let slugs: string[] = [];
  try {
    const svc = await db.service.findMany({ where: { isActive: true }, select: { slug: true } });
    slugs = svc.map((s) => s.slug);
  } catch {
    // build sem DB: apenas páginas estáticas
  }
  return [
    ...staticPages,
    ...slugs.map((slug) => ({ url: `${base}/servicos/${slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}