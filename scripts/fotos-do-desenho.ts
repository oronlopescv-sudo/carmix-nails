// Atualização única (encomenda do dono, 16-11-2026): as fotografias do site
// passam a ser as do desenho (design/site/home-desenho.png). A galeria troca
// as de stock pelas recortes do desenho e o herói passa para a fotografia do
// desenho. Nomes/títulos/alt preservados quando existem.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const fotos = [
    { imageUrl: "/images/galeria/desenho-1.jpg", title: "Manicure francesa natural", alt: "Mãos com unhas francesas naturais", sortOrder: 0 },
    { imageUrl: "/images/galeria/desenho-2.jpg", title: "Nail art de malva", alt: "Unhas com detalhe em malva e lantejoulas", sortOrder: 1 },
    { imageUrl: "/images/galeria/desenho-3.jpg", title: "Vermelho clássico", alt: "Unhas vermelhas longas", sortOrder: 2 },
    { imageUrl: "/images/galeria/desenho-4.jpg", title: "Rosa macio com folheadas", alt: "Unhas rosa macio com folheadas prateadas", sortOrder: 3 },
  ];
  const visiveis = await db.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 4 });
  for (let i = 0; i < visiveis.length; i++) {
    await db.galleryImage.update({ where: { id: visiveis[i].id }, data: fotos[i] });
  }
  if (visiveis.length === 0) {
    await db.galleryImage.createMany({ data: fotos });
  }
  await db.businessSettings.update({ where: { id: 1 }, data: { heroImageUrl: "/images/hero-desenho.jpg" } });
  console.log(`galeria: ${Math.max(visiveis.length, 4)} fotografias trocadas pelas do desenho; herói = hero-desenho.jpg`);
}

main().finally(() => db.$disconnect());
