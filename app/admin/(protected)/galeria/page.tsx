// Galeria: fotos de trabalhos visíveis ao público, ordem manual.

import { db } from "@/lib/db";
import GalleryManager, { type GalleryRow } from "@/components/admin/GalleryManager";

export default async function GaleriaPage() {
  const images = await db.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const rows: Array<GalleryRow> = images.map((g) => ({
    id: g.id,
    imageUrl: g.imageUrl,
    title: g.title,
    alt: g.alt,
    isVisible: g.isVisible,
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Galeria</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">Fotografias de trabalhos reais. As ocultas não aparecem no site.</p>
      <div className="mt-6">
        <GalleryManager images={rows} />
      </div>
    </div>
  );
}