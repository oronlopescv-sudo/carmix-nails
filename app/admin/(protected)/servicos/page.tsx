// Gestão do catálogo: categorias e serviços com preços, duração e fotos.

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import ServicesManager, { type CatRow, type SvcRow } from "@/components/admin/ServicesManager";

export default async function ServicosPage() {
  const s = await getSettings();
  const [categories, services] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  const cats: Array<CatRow> = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  }));

  const list: Array<SvcRow> = services.map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    description: v.description,
    categoryId: v.categoryId,
    priceMin: v.priceMin,
    priceMax: v.priceMax,
    durationMin: v.durationMin,
    gapAfterMinutes: v.gapAfterMinutes,
    isActive: v.isActive,
    isFeatured: v.isFeatured,
    imageUrl: v.imageUrl,
    sortOrder: v.sortOrder,
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Serviços</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">
        Catálogo do site e do agendamento. Preços em escudos ({s.currency}); duração por omissão — ajustável por atendimento.
      </p>
      <div className="mt-6">
        <ServicesManager currency={s.currency} categories={cats} services={list} />
      </div>
    </div>
  );
}