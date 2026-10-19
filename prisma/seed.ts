// Seed inicial — Carmix Nails
//
// Os serviços e preços vêm da tabela de preços real (Precário Carmix Nails).
// Preços guardados em centavos CVE (1 escudo = 100 centavos).
// ⚠️ As DURAÇÕES não estão no precário: foram pré-preenchidas com valores
// típicos de estúdio — o dono pode ajustá-las no painel (Admin → Serviços).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Cat = {
  slug: string;
  name: string;
  sortOrder: number;
};

const CATEGORIES: Cat[] = [
  { slug: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras", sortOrder: 0 },
  { slug: "formatos-e-tratamentos", name: "Formatos e tratamentos", sortOrder: 1 },
  { slug: "pedicure", name: "Pedicure", sortOrder: 2 },
  { slug: "decoracoes", name: "Decorações", sortOrder: 3 },
  { slug: "reconstrucao-manutencao", name: "Reconstrução, manutenção e remoção", sortOrder: 4 },
];

type Svc = {
  cat: string; // slug da categoria
  name: string;
  slug: string;
  priceMin: number; // centavos
  priceMax?: number;
  duration: number; // minutos — ESTIMADO
  gapAfter?: number;
  featured?: boolean;
  description?: string;
};

const SERVICES: Svc[] = [
  // 1. Unhas de gel com fibras — 1 serviço por tamanho (preços do precário)
  { cat: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras — S (pequeno)", slug: "gel-fibras-s", priceMin: 220_000, duration: 90, gapAfter: 10, featured: true,
    description: "Extensão de unhas em gel com fibras, tamanho pequeno. Formato à escolha sem custo adicional (almond e stiletto incluem taxa)." },
  { cat: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras — M (médio)", slug: "gel-fibras-m", priceMin: 240_000, duration: 90, gapAfter: 10, featured: true,
    description: "Extensão de unhas em gel com fibras, tamanho médio. Formato à escolha sem custo adicional (almond e stiletto incluem taxa)." },
  { cat: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras — L (médio grande)", slug: "gel-fibras-l", priceMin: 260_000, duration: 90, gapAfter: 10, featured: true,
    description: "Extensão de unhas em gel com fibras, tamanho médio grande. Formato à escolha sem custo adicional (almond e stiletto incluem taxa)." },
  { cat: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras — XL (grande)", slug: "gel-fibras-xl", priceMin: 300_000, duration: 95, gapAfter: 10,
    description: "Extensão de unhas em gel com fibras, tamanho grande. Formato à escolha sem custo adicional (almond e stiletto incluem taxa)." },
  { cat: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras — XXL (muito grande)", slug: "gel-fibras-xxl", priceMin: 400_000, duration: 100, gapAfter: 10,
    description: "Extensão de unhas em gel com fibras, tamanho muito grande. Formato à escolha sem custo adicional (almond e stiletto incluem taxa)." },
  { cat: "unhas-de-gel-com-fibras", name: "Unhas de gel com fibras — XXXL", slug: "gel-fibras-xxxl", priceMin: 600_000, duration: 110, gapAfter: 10,
    description: "Extensão de unhas em gel com fibras, tamanho XXXL. Formato à escolha sem custo adicional (almond e stiletto incluem taxa)." },

  // 2. Formatos e tratamentos
  { cat: "formatos-e-tratamentos", name: "Almond ou stiletto", slug: "almond-stiletto", priceMin: 20_000, duration: 20, gapAfter: 5,
    description: "Taxa de formato especial aplicada sobre o conjunto de gel. Somar ao preço do tamanho escolhido." },
  { cat: "formatos-e-tratamentos", name: "1 ou 2 dedos em destaque", slug: "dedos-destaque", priceMin: 50_000, duration: 20, gapAfter: 5,
    description: "Trabalho especial em 1 ou 2 dedos (cada). Somar ao conjunto de gel." },
  { cat: "formatos-e-tratamentos", name: "Encapsulada", slug: "encapsulada", priceMin: 10_000, duration: 25, gapAfter: 5,
    description: "Encapsulação aplicada ao conjunto de gel (elementos selados dentro do gel). Somar ao preço do tamanho escolhido." },
  { cat: "formatos-e-tratamentos", name: "Banho de gel", slug: "banho-de-gel", priceMin: 200_000, duration: 45, gapAfter: 5,
    description: "Banho de gel sobre as unhas naturais, para fortalecer e dar brilho." },

  // 3. Pedicure
  { cat: "pedicure", name: "Pedicure completo + gelinho", slug: "pedicure-completo-gelinho", priceMin: 200_000, duration: 75, gapAfter: 10, featured: true,
    description: "Pedicure completo com aplicação de gelinho pé." },
  { cat: "pedicure", name: "Gelinho pé", slug: "gelinho-pe", priceMin: 100_000, duration: 45, gapAfter: 5,
    description: "Aplicação de gelinho nas unhas dos pés (sem pedicure completo)." },

  // 4. Decorações (taxas a somar ao conjunto — livro para marcações dedicadas)
  { cat: "decoracoes", name: "Pedrinhas ou autocolantes", slug: "pedrinhas-autocolantes", priceMin: 5_000, duration: 10,
    description: "Decoração com pedrinhas ou autocolantes. Valor a somar ao tratamento." },
  { cat: "decoracoes", name: "Baby boomer, body color ou desenhos com riscos", slug: "baby-boomer-body-color-riscos", priceMin: 10_000, duration: 15,
    description: "Efeito baby boomer, body color ou desenhos com riscos. Valor a somar ao tratamento." },
  { cat: "decoracoes", name: "Uma unha cheia de pedrinhas", slug: "unha-pedrinhas", priceMin: 20_000, duration: 15,
    description: "Decoração especial numa unha cheia de pedrinhas. Valor a somar ao tratamento." },
  { cat: "decoracoes", name: "Encapsulada de flor seca ou desenhos elaborados", slug: "encapsulada-flor-seca-elaborados", priceMin: 10_000, priceMax: 15_000, duration: 20,
    description: "Encapsulada com flor seca ou desenho elaborado (preço conforme a elaboração). Valor a somar ao tratamento." },
  { cat: "decoracoes", name: "Dedo com mais de 4 pedras", slug: "dedo-mais-4-pedras", priceMin: 7_000, duration: 10,
    description: "Taxa por dedo decorado com mais de 4 pedras. Valor a somar ao tratamento." },

  // 5. Reconstrução, manutenção e remoção
  { cat: "reconstrucao-manutencao", name: "Reconstrução do dedo", slug: "reconstrucao-dedo", priceMin: 30_000, duration: 20, gapAfter: 5,
    description: "Reconstrução de uma unha danificada." },
  { cat: "reconstrucao-manutencao", name: "Remoção de gel", slug: "remocao-gel", priceMin: 50_000, duration: 30,
    description: "Remoção segura do gel nas unhas." },
  { cat: "reconstrucao-manutencao", name: "Remoção de gelinho", slug: "remocao-gelinho", priceMin: 20_000, duration: 20,
    description: "Remoção segura do gelinho." },
  { cat: "reconstrucao-manutencao", name: "Manutenção de gel", slug: "manutencao-gel", priceMin: 200_000, duration: 60, gapAfter: 10, featured: true,
    description: "Manutenção da aplicação de gel com fibras (retouch)." },
  { cat: "reconstrucao-manutencao", name: "Fibra em unha quebrada (cada unha)", slug: "fibra-unha-quebrada", priceMin: 20_000, duration: 15, gapAfter: 5,
    description: "Colocação de fibra numa unha quebrada (por unha)." },
  { cat: "reconstrucao-manutencao", name: "Manter o tamanho", slug: "manter-tamanho", priceMin: 20_000, duration: 20, gapAfter: 5,
    description: "Ajuste/corte para manter o tamanho no serviço de manutenção. Valor a somar." },
];

async function main() {
  console.log("Carmix Nails — seed iniciado");

  // ── Configuração da marca (linha única) ────────────────────────────────────
  await db.businessSettings.upsert({
    where: { id: 1 },
    update: {
      servicesNote:
        "Os preços não incluem as decorações. Caso a cliente deseje decoração nas unhas, é aplicada uma taxa adicional entre 50$00 e 200$00, dependendo do pedido.",
    },
    create: {
      id: 1,
      brandName: "Carmix Nails",
      ownerName: "Carmo Gomes",
      tagline: "Nails studio",
      heroTitle: "Unhas de gel com fibras, feitas com detalhe e carinho",
      heroSubtitle:
        "Marcação online simples, horários respeitados e um atendimento dedicado a cada cliente.",
      aboutTitle: "Sobre a Carmix Nails",
      timezone: "Atlantic/Cape_Verde",
      currency: "CVE",
      slotIntervalMinutes: 15,
      minLeadMinutes: 60,
      maxLeadDays: 60,
      autoConfirm: false,
      bookingEnabled: true,
      minCancelHours: 24,
      allowReschedule: true,
      cancelPolicyText:
        "Pode cancelar ou remarcar a sua marcação até 24 horas antes da hora marcada. Cancelamentos de última hora e faltas sem aviso podem sujeir a agilidade de outras clientes e são registados.",
      servicesNote:
        "Os preços não incluem as decorações. Caso a cliente deseje decoração nas unhas, é aplicada uma taxa adicional entre 50$00 e 200$00, dependendo do pedido.",
      seoTitle: "Carmix Nails — Unhas de gel com fibras | Marcação online",
      seoDescription:
        "Unhas de gel com fibras, banho de gel, pedicure e decorações. Marque a sua hora online com a Carmix Nails.",
    },
  });

  // ── Categorias ─────────────────────────────────────────────────────────────
  for (const c of CATEGORIES) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: { ...c },
    });
  }

  // ── Serviços ───────────────────────────────────────────────────────────────
  const catIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.findUnique({ where: { slug: c.slug } });
    if (row) catIds.set(c.slug, row.id);
  }

  for (const [i, s] of SERVICES.entries()) {
    const existing = await db.service.findUnique({ where: { slug: s.slug } });
    const data = {
      name: s.name,
      slug: s.slug,
      description: s.description ?? null,
      categoryId: catIds.get(s.cat) ?? null,
      priceMin: s.priceMin,
      priceMax: s.priceMax ?? null,
      durationMin: s.duration,
      gapAfterMinutes: s.gapAfter ?? 0,
      isActive: true,
      isFeatured: Boolean(s.featured),
      sortOrder: i,
    };
    if (existing) {
      await db.service.update({ where: { id: existing.id }, data });
    } else {
      await db.service.create({ data });
    }
  }

  // ── Fotografias de stock (Unsplash, licença livre) — TEMPORÁRIAS ───────────
  // Colocadas só enquanto a galeria/hero estão vazias, para o site não nascer
  // sem imagens. Assim que o dono carrega fotos reais no painel, estas nunca
  // mais são escritas (galeria: só se a tabela estiver vazia; campos de imagem:
  // só se ainda estiverem a null) — nem dados reais da dona são descartados.
  const GALLERY_STOCK = [
    { imageUrl: "/images/seed/galeria-polido.jpg", title: "Manicure em tons naturais", alt: "Mãos com unhas polidas em tons naturais", sortOrder: 0 },
    { imageUrl: "/images/seed/servico-fibras.jpg", title: "Almond com pontas prateadas", alt: "Unhas almond com pontas prateadas", sortOrder: 1 },
    { imageUrl: "/images/seed/servico-gel.jpg", title: "Manicure em gel", alt: "Manicure em gel com acabamento brilhante", sortOrder: 2 },
    { imageUrl: "/images/seed/galeria-preta.jpg", title: "Manicure preta", alt: "Mãos com manicure preta", sortOrder: 3 },
    { imageUrl: "/images/seed/galeria-art.jpg", title: "Nail art", alt: "Nail art detalhada", sortOrder: 4 },
  ];
  if ((await db.galleryImage.count()) === 0) {
    await db.galleryImage.createMany({ data: GALLERY_STOCK });
    console.log("  galeria: 5 fotografias de stock (Unsplash) — temporárias até fotos reais");
  }

  const STOCK_SERVICE_IMAGES: Record<string, string> = {
    "gel-fibras-s": "/images/seed/servico-fibras.jpg",
    "gel-fibras-m": "/images/seed/servico-fibras.jpg",
    "gel-fibras-l": "/images/seed/servico-fibras.jpg",
    "manutencao-gel": "/images/seed/servico-gel.jpg",
  };
  for (const [slug, imageUrl] of Object.entries(STOCK_SERVICE_IMAGES)) {
    const svc = await db.service.findUnique({ where: { slug }, select: { id: true, imageUrl: true } });
    if (svc && svc.imageUrl === null) {
      await db.service.update({ where: { id: svc.id }, data: { imageUrl } });
    }
  }

  const settingsRow = await db.businessSettings.findUnique({ where: { id: 1 }, select: { heroImageUrl: true } });
  if (settingsRow && settingsRow.heroImageUrl === null) {
    await db.businessSettings.update({
      where: { id: 1 },
      data: { heroImageUrl: "/images/seed/hero-nails.jpg" },
    });
  }

  // ── Profissional padrão (a dona do estúdio) ────────────────────────────────
  const pro = await db.professional.upsert({
    where: { slug: "carmo-gomes" },
    update: { name: "Carmo Gomes", title: "Nail artist" },
    create: {
      name: "Carmo Gomes",
      slug: "carmo-gomes",
      title: "Nail artist",
      isActive: true,
      sortOrder: 0,
    },
  });

  // ── Serviços atribuídos ao profissional (todos por defeito) ────────────────
  const services = await db.service.findMany({ select: { id: true, slug: true } });
  const currentLinks = new Set(
    (await db.professionalService.findMany({ where: { professionalId: pro.id } })).map((l) => l.serviceId),
  );
  const toCreate = services.filter((s) => !currentLinks.has(s.id)).map((s) => s.id);
  await db.professionalService.createMany({
    data: toCreate.map((serviceId) => ({ professionalId: pro.id, serviceId })),
    skipDuplicates: true,
  });

  // ── Horário de trabalho padrão (edítvel no painel) ─────────────────────────
  // Segunda a sexta 08:30–17:30, sábado 08:30–13:00, domingo fechado.
  const existingAvail = await db.availability.findMany({ where: { professionalId: pro.id } });
  if (existingAvail.length === 0) {
    const rows = [] as Array<{ professionalId: string; weekday: number; startMinute: number; endMinute: number; isActive: boolean }>;
    for (let wd = 1; wd <= 5; wd++) {
      rows.push({ professionalId: pro.id, weekday: wd, startMinute: 510, endMinute: 1050, isActive: true });
    }
    rows.push({ professionalId: pro.id, weekday: 6, startMinute: 510, endMinute: 780, isActive: true });
    await db.availability.createMany({ data: rows });
  }

  console.log("Carmix Nails — seed concluído:");
  console.log(`  categorias: ${CATEGORIES.length} · serviços: ${SERVICES.length} · profissional: ${pro.name}`);
  console.log("  durações pré-preenchidas (ajustáveis no painel) · horário Seg–Sáb 08:30–17:30 / Sáb até 13:00");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());