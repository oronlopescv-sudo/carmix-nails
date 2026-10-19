import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/mail";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/reserva"],
      },
    ],
    sitemap: siteUrl() + "/sitemap.xml",
  };
}