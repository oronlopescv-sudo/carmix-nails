import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  Mail,
  MapPin,
  Phone,
  Star,
  Facebook,
  Instagram,
} from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getVisibleGallery, getPublishedReviews } from "@/lib/queries";
import SectionTitle from "@/components/ui/SectionTitle";
import TikTokIcon from "@/components/ui/TikTokIcon";
import { FloreioCoracao, OrnamentoCoracao } from "@/components/ui/Floreio";
import { Reveal } from "@/components/ui/Reveal";

// As sete artes de serviço do desenho do dono, na mesma ordem, com os glifos
// originais do desenho recortados para PNG transparente (public/images/decor).
const SERVICOS_DESENHO = [
  { icone: "ic-manicure", label: "Manicure\ne Pedicure" },
  { icone: "ic-alongamento", label: "Alongamento\nde Unhas" },
  { icone: "ic-gel", label: "Gel e Verniz\nPermanente" },
  { icone: "ic-nailart", label: "Nail Art\nPersonalizada" },
  { icone: "ic-depilacao", label: "Depilação" },
  { icone: "ic-faciais", label: "Cuidados\nFaciais" },
  { icone: "ic-tratamentos", label: "Tratamentos\nde Beleza" },
];

// Os dois blocos do logotipo: primeiro nome em letra manuscrita, a seguir serifado.
const MARCA_SCRIPT = "Carmix";
const MARCA_SERIF = "Nails Designer";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5 text-dourado" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-dourado" : "fill-transparent text-malva-soft"}`} />
      ))}
    </span>
  );
}


export default async function Home() {
  const s = await getSettings();
  const [gallery, reviews] = await Promise.all([getVisibleGallery(8), getPublishedReviews(6)]);

  return (
    <>
      {/* ── Herói — a composição do desenho do dono, inteira em unidades de largura (vw):
          a secção tem 520/1536 de altura no desenho; tudo dentro escala com o ecrã,
          e a navegação flutuante cobre por exato o chrome desenhado na fotografia. ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eed0e4] via-[#f8e9f3] to-[#fbe7f4] md:h-[33.85vw]">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-malva-soft/45 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-white/60 blur-2xl" />
        {/* flores do meio à esquerda (sem o logótipo, que é o real de cima) */}
        <Image
          src="/images/decor/flores-hero-esquerda.png"
          alt=""
          aria-hidden
          width={182}
          height={302}
          style={{ maskImage: "linear-gradient(to right, #000 70%, transparent 100%)" }}
          className="pointer-events-none absolute bottom-0 left-0 hidden w-[11.86vw] md:block"
        />
        {/* moita de flores baixa, só no telemóvel */}
        <Image
          src="/images/decor/flores-hero-baixo.png"
          alt=""
          aria-hidden
          width={260}
          height={234}
          className="pointer-events-none absolute -left-6 bottom-6 w-40 rotate-[8deg] opacity-90"
        />
        {/* navegação flutuante do desenho (md+), nas percentagens dele:
            logótipo 95px·5px·210px · pílula do menu 445→1135px · botão 1318→1498px, na faixa 520px */}
        <div aria-hidden={false} className="pointer-events-none absolute inset-0 hidden md:block">
          <Link
            href="/"
            className="pointer-events-auto absolute left-[6.19vw] top-[0.33vw] z-10"
            aria-label="Carmix — página inicial"
          >
            <Image
              src="/images/carmix-logo.png"
              alt={MARCA_SCRIPT}
              width={520}
              height={550}
              priority
              className="h-[14.1vw] w-auto drop-shadow-sm"
            />
          </Link>
          <nav
            aria-label="Navegação principal"
            className="pointer-events-auto absolute left-[28.97vw] top-[1.43vw] z-10 flex h-[4.293vw] items-center gap-[0.55vw] rounded-full bg-creme/60 px-[1.1vw] shadow-sm ring-1 ring-white/50 backdrop-blur"
          >
            {[
              { href: "/", label: "Início", atual: true },
              { href: "/servicos", label: "Serviços" },
              { href: "/sobre", label: "Sobre Nós" },
              { href: "/galeria", label: "Galeria" },
              { href: "/#testemunhos", label: "Depoimentos" },
              { href: "/contactos", label: "Contacto" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-[1.05vw] py-[0.42vw] font-display text-[1.34vw] leading-none transition-colors ${
                  item.atual
                    ? "bg-bordo text-creme"
                    : "text-tinta hover:text-bordo"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {s.bookingEnabled ? (
            <Link
              href="/agendar"
              className="pointer-events-auto absolute left-[85.81vw] top-[1.43vw] z-10 flex h-[4.16vw] items-center gap-[0.5vw] whitespace-nowrap rounded-[0.65vw] bg-bordo px-[0.95vw] font-display text-[1.24vw] font-medium text-creme shadow-lg shadow-bordo/25 transition hover:bg-bordo-dark"
            >
              <CalendarCheck className="h-[1.5vw] w-[1.5vw]" />
              Marcar Horário
            </Link>
          ) : null}
        </div>
        {/* fotografia do desenho, na proporção exata do recorte (746:520) —
            ocupando 33.85vw de altura do herói, tal e qual o desenho (md+) */}
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full md:block md:aspect-[746/520]">
          <Image
            src={s.heroImageUrl || "/images/hero-desenho.jpg"}
            alt=""
            fill
            priority
            sizes="53vw"
            className="object-fill"
          />
        </div>
        {/* flores do meio à esquerda, tal e qual o desenho (com a borda direita em esbatido) */}
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-8 px-4 pb-16 pt-[122px] sm:px-6 md:grid-cols-[1fr_1fr] md:pb-0 md:pt-[9.2vw]">
          <div className="animate-fade-up text-center md:px-2">
            <p className="font-display text-[13px] font-medium uppercase tracking-[0.42em] text-tinta md:text-[1.05vw]">
              {s.tagline || "Bem-vinda ao"}
            </p>
            <h1 className="mt-1 leading-none">
              <span className="relative inline-flex items-start justify-center">
                <span className="font-script text-[58px] leading-none text-bordo md:text-[7.29vw]">{MARCA_SCRIPT}</span>
                {/* floreio de coração, traço original do desenho */}
                <FloreioCoracao className="pointer-events-none absolute -right-[64px] top-0 w-[92px] md:-right-[7.4vw] md:top-[1.1vw] md:w-[8.6vw]" />
              </span>
              <span className="mt-1 block font-display text-[30px] font-medium text-[#1e0f1b] md:mt-[0.3vw] md:text-[2.6vw]">
                {MARCA_SERIF}
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm whitespace-pre-line font-display text-[19px] font-semibold leading-[1.32] text-tinta md:mt-[0.98vw] md:max-w-[26vw] md:text-[1.69vw] md:leading-snug">
              {s.heroSubtitle || "Beleza nas suas mãos,\ncom muito amor e dedicação!"}
            </p>
            <div className="mt-4 flex items-center justify-center md:mt-[0.15vw]">
              <OrnamentoCoracao className="w-[180px] md:w-[12.6vw]" />
            </div>
            <div className="mt-6 md:mt-[0.35vw]">
              {!s.bookingEnabled ? (
                <span className="inline-block rounded-full bg-white px-6 py-3 text-sm text-tinta-soft shadow-sm">
                  As marcações estão temporariamente desativadas.
                </span>
              ) : (
                <Link
                  href="/agendar"
                  className="group inline-flex items-center gap-2 rounded-full bg-bordo px-7 py-3.5 font-display text-[15.5px] font-medium text-creme md:gap-[0.6vw] md:px-[1.7vw] md:py-[1.05vw] md:text-[1.45vw] shadow-lg shadow-bordo/30 transition hover:bg-bordo-dark hover:shadow-xl active:scale-[0.98]"
                >
                  <CalendarCheck className="h-4.5 w-4.5 md:h-[1.56vw] md:w-[1.56vw]" />
                  Agende já o seu horário
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 md:h-[1.3vw] md:w-[1.3vw]" />
                </Link>
              )}
            </div>
          </div>

          {/* em telemóvel a foto mantém-se em cartão arredondado (md+ sangra pelo absoluto) */}
          <div className="relative md:hidden">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-casca shadow-lg ring-1 ring-malva-soft/60">
              {s.heroImageUrl && (
                <Image
                  src={s.heroImageUrl}
                  alt={`Imagem principal da ${s.brandName}`}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Os Nossos Serviços — sete cartões brancos, os mesmos do desenho ── */}
      <section className="bg-casca py-14 sm:py-16" id="servicos">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <Reveal>
            <SectionTitle>Os Nossos Serviços</SectionTitle>
          </Reveal>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SERVICOS_DESENHO.map(({ icone, label }, i) => (
              <Reveal key={icone} delay={i * 0.04}>
                <Link
                  href="/servicos"
                  className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-creme px-3 py-6 text-center shadow-sm ring-1 ring-malva-soft/50 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="grid h-11 w-11 place-items-center transition-transform group-hover:scale-110">
                    <Image
                      src={`/images/decor/${icone}.png`}
                      alt=""
                      aria-hidden
                      width={96}
                      height={96}
                      className="h-11 w-11 object-contain"
                    />
                  </span>
                  <span className="whitespace-pre-line font-display text-[13.5px] font-medium leading-snug text-tinta">
                    {label}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sobre · Galeria · Contacte-nos — a faixa tripartida do desenho ── */}
      <section className="bg-nude py-14 sm:py-16">
        <div className="mx-auto grid max-w-[1240px] items-start gap-10 px-4 sm:px-6 lg:grid-cols-[6fr_2.4fr_7.4fr_6fr] lg:gap-6">
          {/* Sobre o Carmix */}
          <Reveal>
            <div>
              <h2 className="font-script text-[46px] text-bordo sm:text-[54px]">Sobre o Carmix</h2>
              <p className="mt-3 font-display text-[15.5px] leading-relaxed text-tinta-soft">
                {s.aboutText ||
                  "Mais do que um salão, somos um espaço dedicado ao seu bem-estar, beleza e autoestima. Aqui encontra um atendimento profissional, num ambiente acolhedor e moderno."}
              </p>
              <Link
                href="/sobre"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 font-display text-[14.5px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
              >
                Saber Mais
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 md:h-[1.3vw] md:w-[1.3vw]" />
              </Link>
            </div>
          </Reveal>

          {/* wreath só de flores e anel (recorte do desenho, sem escrita) */}
          <Reveal delay={0.08} className="hidden justify-center lg:flex">
            <Image
              src="/images/decor/wreathe-faixa.png"
              alt=""
              aria-hidden
              width={240}
              height={211}
              className="h-auto w-[140px] md:w-[11.3vw]"
            />
          </Reveal>

          {/* A Nossa Galeria */}
          <Reveal delay={0.12}>
            <div>
              <div className="flex items-center justify-center gap-3 sm:justify-start sm:gap-4">
                <span aria-hidden className="hidden h-px flex-1 bg-malva-soft sm:block" />
                <h2 className="text-center font-script text-[46px] text-bordo sm:text-[52px]">
                  A Nossa Galeria
                </h2>
                <span aria-hidden className="h-px flex-1 bg-malva-soft" />
              </div>
              {gallery.length > 0 && (
                <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
                  {gallery.slice(0, 4).map((img, i) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-casca ring-1 ring-malva-soft/60 transition hover:ring-dourado/60">
                      <Image
                        src={img.imageUrl}
                        alt={img.alt || img.title || "Trabalho da Carmix Nails"}
                        fill
                        sizes="(max-width: 640px) 25vw, 15vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  ))}
                </div>
              )}
            <div className="mt-5 flex justify-center">
                <Link
                  href="/galeria"
                  className="group inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 font-display text-[14.5px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
                >
                  Ver Mais Fotos
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 md:h-[1.3vw] md:w-[1.3vw]" />
                </Link>
            </div>
            </div>
          </Reveal>

          {/* Contacte-nos — cartão lila do desenho */}
          <Reveal delay={0.16}>
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#f5ddf3] p-6 shadow-sm ring-1 ring-malva-soft/50">
              {/* folhinha decorativa do canto (recorte do desenho) */}
              <Image
                src="/images/decor/folha-cartao.png"
                alt=""
                aria-hidden
                width={150}
                height={119}
                className="pointer-events-none absolute -right-2 -top-3 w-20 opacity-95"
              />
              <h2 className="font-script text-[46px] text-bordo sm:text-[52px]">Contacte-nos</h2>
              <ul className="mt-4 space-y-3 font-display text-[14.5px] text-tinta">
                {s.phone ? (
                  <li>
                    <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2.5 hover:text-bordo">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bordo/90 text-creme"><Phone className="h-3.5 w-3.5" /></span>
                      {s.phone}
                    </a>
                  </li>
                ) : null}
                {(s.address || s.city) && (
                  <li className="inline-flex items-start gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bordo/90 text-creme"><MapPin className="h-3.5 w-3.5" /></span>
                    <span>
                      {s.address}
                      {s.city ? (
                        <>
                          <br />
                          <span className="text-tinta-soft">{s.city}</span>
                        </>
                      ) : null}
                    </span>
                  </li>
                )}
                {s.email ? (
                  <li>
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2.5 hover:text-bordo">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bordo/90 text-creme"><Mail className="h-3.5 w-3.5" /></span>
                      {s.email}
                    </a>
                  </li>
                ) : null}
              </ul>
              {(s.instagram || s.facebook || s.tiktok) && (
                <>
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <span aria-hidden className="h-px w-8 bg-malva/40" />
                    <span className="font-script text-[30px] text-bordo">Siga-nos</span>
                  </div>
                  <div className="mt-2.5 flex justify-end gap-2.5">
                    {s.facebook && (
                      <a
                        href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="grid h-9 w-9 place-items-center rounded-full bg-tinta text-creme transition hover:opacity-85"
                      >
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {s.instagram && (
                      <a
                        href={s.instagram.startsWith("http") ? s.instagram : `https://instagram.com/${s.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="grid h-9 w-9 place-items-center rounded-full bg-tinta text-creme transition hover:opacity-85"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {s.tiktok && (
                      <a
                        href={s.tiktok.startsWith("http") ? s.tiktok : `https://tiktok.com/@${s.tiktok}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="TikTok"
                        className="grid h-9 w-9 place-items-center rounded-full bg-tinta text-creme transition hover:opacity-85"
                      >
                        <TikTokIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </>
              )}
              <Link href="/contactos" className="mt-5 block text-center text-[13px] font-medium text-bordo underline-offset-4 hover:underline">
                Página de contactos com mapa e horários
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Depoimentos — conteúdo gerido pelo dono (apontado pelo menu) ── */}
      {reviews.length > 0 && (
        <section className="bg-creme pb-16 pt-2" id="testemunhos">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <Reveal>
              <SectionTitle>Depoimentos</SectionTitle>
            </Reveal>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r, i) => (
                <Reveal key={r.id} delay={i * 0.06}>
                  <figure className="flex h-full flex-col rounded-2xl bg-nude p-6 ring-1 ring-malva-soft/50">
                    <Stars n={r.rating} />
                    <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed text-tinta">
                      “{r.text}”
                    </blockquote>
                    <figcaption className="mt-4 text-[13px] font-medium text-tinta-soft">— {r.customerName}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
