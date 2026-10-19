import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Clock, Star, Sparkles, ArrowRight, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { formatPriceRange } from "@/lib/pricing";
import {
  getFeaturedServices,
  getVisibleGallery,
  getPublishedReviews,
  getScheduleSummary,
  nextOpening,
} from "@/lib/queries";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/constants";
import { minutesToHM, wallNow, weekdayOfDay } from "@/lib/tz";
import { WaveDivider } from "@/components/ui/Waves";
import { Reveal } from "@/components/ui/Reveal";

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
  const [featured, gallery, reviews, schedule] = await Promise.all([
    getFeaturedServices(6),
    getVisibleGallery(8),
    getPublishedReviews(6),
    getScheduleSummary(),
  ]);
  const now = wallNow(s.timezone);
  const nextDay = nextOpening(schedule, now);
  const nextWeekday = weekdayOfDay(nextDay);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-nude">
        {/* profundidade: luz suave atrás do texto e da imagem */}
        <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-malva-soft/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-dourado-light/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-12 sm:px-6 md:grid-cols-2 md:gap-12 md:pb-20 md:pt-16">
          <div className="animate-fade-up">
            {s.tagline && (
              <p className="text-[12px] uppercase tracking-[0.3em] text-malva">{s.tagline}</p>
            )}
            <h1 className="mt-3 font-display text-4xl leading-tight text-bordo text-balance sm:text-5xl">
              {s.heroTitle || `${s.brandName} — unhas com detalhe e carinho`}
            </h1>
            <p className="mt-5 max-w-md text-[16.5px] leading-relaxed text-tinta-soft">
              {s.heroSubtitle ||
                "Unhas de gel com fibras, banho de gel, pedicure e decorações em um espaço dedicado a cada detalhe. Marque a sua hora online."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {!s.bookingEnabled ? (
                <span className="rounded-full bg-white px-6 py-3 text-sm text-tinta-soft shadow-sm">
                  As marcações estão temporariamente desativadas — use o WhatsApp.
                </span>
              ) : (
                <Link
                  href="/agendar"
                  className="group inline-flex items-center gap-2 rounded-full bg-bordo px-7 py-3.5 text-[15px] font-medium text-creme shadow-sm shadow-bordo/15 transition hover:bg-bordo-dark hover:shadow-md active:scale-[0.98]"
                >
                  <CalendarCheck className="h-4.5 w-4.5" />
                  Marcar Agendamento
                </Link>
              )}
              <Link
                href="/servicos"
                className="inline-flex items-center gap-1.5 rounded-full border border-malva-soft bg-creme px-6 py-3.5 text-[15px] font-medium text-malva transition hover:border-malva hover:text-bordo"
              >
                Ver serviços e preços
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-tinta-soft">
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-dourado" /> Gel com fibras</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-dourado" /> Horários respeitados</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-dourado" /> Atendimento dedicado</span>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-casca shadow-lg ring-1 ring-malva/10">
              {s.heroImageUrl ? (
                <Image
                  src={s.heroImageUrl}
                  alt={`Imagem principal da ${s.brandName}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-nude via-casca to-malva-soft/50 p-10">
                  <div className="text-center">
                    <span className="grid mx-auto h-20 w-20 place-items-center rounded-full bg-bordo text-creme shadow-md ring-4 ring-dourado/30">
                      <span className="font-display text-2xl font-semibold">CN</span>
                    </span>
                    <p className="mt-6 font-display text-2xl text-bordo">{s.brandName}</p>
                    <p className="mt-2 text-sm text-tinta-soft">Adicione uma fotografia no painel administrativo.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="animate-float-slow absolute -bottom-5 -left-4 rounded-2xl bg-creme px-4 py-3 text-sm shadow-md ring-1 ring-nude sm:-left-8">
              <p className="font-medium text-bordo">Unhas de gel com fibras</p>
              <p className="text-[12.5px] text-tinta-soft">desde {formatPriceRange(220000, null, s.currency)}</p>
            </div>
          </div>
        </div>
        <div className="-mb-px">
          <WaveDivider from="#F8F0F3" />
        </div>
      </section>

      {/* ── Serviços em destaque ─────────────────────────────── */}
      <section className="bg-casca py-16 sm:py-20" id="servicos-destaque">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Serviços</p>
                <h2 className="mt-2 font-display text-3xl text-bordo sm:text-4xl">Trabalhos em destaque</h2>
              </div>
              <Link href="/servicos" className="group inline-flex items-center gap-1.5 text-[14.5px] font-medium text-malva hover:text-bordo">
                Tabela completa
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((svc, i) => (
              <Reveal key={svc.id} delay={i * 0.06}>
                <Link
                  href={`/servicos/${svc.slug}`}
                  className="group flex h-full flex-col rounded-2xl bg-creme p-6 shadow-sm ring-1 ring-nude transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {svc.imageUrl && (
                    <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl">
                      <Image src={svc.imageUrl} alt={svc.name} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                    </div>
                  )}
                  {svc.categoryName && (
                    <p className="text-[11px] uppercase tracking-[0.18em] text-malva">{svc.categoryName}</p>
                  )}
                  <h3 className="mt-1.5 font-display text-xl leading-snug text-tinta group-hover:text-bordo">{svc.name}</h3>
                  {svc.description && (
                    <p className="mt-2 line-clamp-2 text-[14px] text-tinta-soft">{svc.description}</p>
                  )}
                  <div className="mt-auto flex items-baseline justify-between pt-4">
                    <span className="font-medium text-bordo">{formatPriceRange(svc.priceMin, svc.priceMax, s.currency)}</span>
                    <span className="text-[12.5px] text-tinta-soft">~{svc.durationMin} min</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          {s.servicesNote && (
            <Reveal>
              <p className="mt-8 rounded-xl bg-creme p-4 text-[13.5px] text-tinta-soft ring-1 ring-nude">
                {s.servicesNote}
              </p>
            </Reveal>
          )}
        </div>
      </section>

      <div className="-mb-px bg-casca">
        <WaveDivider from="#F2E5E8" />
      </div>

      {/* ── A profissional ─────────────────────────────────── */}
      <section className="bg-nude py-16 sm:py-20" id="sobre">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-casca shadow-md ring-1 ring-nude">
              {s.aboutImageUrl ? (
                <Image src={s.aboutImageUrl} alt={`${s.ownerName} — ${s.brandName}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center p-10 text-center">
                  <p className="text-sm text-tinta-soft">Fotografia do espaço no painel administrativo.</p>
                </div>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Sobre</p>
            <h2 className="mt-2 font-display text-3xl text-bordo sm:text-4xl">
              {s.aboutTitle || `Conheça ${s.ownerName}`}
            </h2>
            <div className="prose-carmix mt-5 text-[15.5px] text-tinta-soft">
              {(s.aboutText ||
                `${s.brandName} é o espaço de ${s.ownerName}, dedicado a unhas de gel com fibras e cuidados com as mãos e os pés. Cada marcação é feita com tempo suficiente para um resultado bonito e duradouro.`)
                .split("\n\n")
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
            <Link
              href="/sobre"
              className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-malva hover:text-bordo"
            >
              Conhecer o espaço <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Galeria ─────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section id="galeria">
          <div className="bg-nude -mb-px">
            <WaveDivider from="#FFFCF8" />
          </div>
          <div className="bg-creme pb-16 pt-2">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Galeria</p>
                    <h2 className="mt-2 font-display text-3xl text-bordo sm:text-4xl">Trabalhos recentes</h2>
                  </div>
                  <Link href="/galeria" className="group inline-flex items-center gap-1.5 text-[14.5px] font-medium text-malva hover:text-bordo">
                    Ver galeria <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gallery.slice(0, 8).map((img, i) => (
                  <Reveal key={img.id} delay={i * 0.04}>
                    <div className="group relative aspect-square overflow-hidden rounded-xl bg-casca ring-1 ring-nude transition hover:ring-dourado/50">
                      <Image src={img.imageUrl} alt={img.alt || img.title || "Trabalho da Carmix Nails"} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Testemunhos ─────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="bg-creme pb-16" id="testemunhos">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Testemunhos</p>
              <h2 className="mt-2 font-display text-3xl text-bordo sm:text-4xl">O que dizem as clientes</h2>
            </Reveal>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r, i) => (
                <Reveal key={r.id} delay={i * 0.06}>
                  <figure className="flex h-full flex-col rounded-2xl bg-casca p-6 ring-1 ring-nude">
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

      {/* ── Horário + Contactos ──────────────────────────────── */}
      <section className="bg-casca py-16 sm:py-20" id="contacto">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2">
          <Reveal>
            <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Horário</p>
            <h2 className="mt-2 font-display text-3xl text-bordo sm:text-4xl">Quando nos encontra</h2>
            <table className="mt-6 w-full max-w-md text-[14.5px]">
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                  const d = schedule.find((x) => x.weekday === wd);
                  const next = d && d.windows.length > 0;
                  return (
                    <tr key={wd} className={next ? "" : "text-tinta-soft/60"}>
                      <td className={`py-1.5 pr-4 ${wd === nextWeekday ? "font-semibold text-bordo" : ""}`}>
                        {WEEKDAY_SHORT[wd]}
                      </td>
                      <td className="py-1.5 tabular-nums">
                        {next ? d!.windows.map(([a, b]) => `${minutesToHM(a)}–${minutesToHM(b)}`).join(" · ") : "Fechado"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!s.bookingEnabled ? null : (
              <Link
                href="/agendar"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
              >
                <CalendarCheck className="h-4 w-4" /> Marcar Agendamento
              </Link>
            )}
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Contactos</p>
            <h2 className="mt-2 font-display text-3xl text-bordo sm:text-4xl">Fale connosco</h2>
            <ul className="mt-6 space-y-3 text-[15px] text-tinta">
              {s.phone && (
                <li>
                  <a href={`tel:${s.phone}`} className="inline-flex items-center gap-2.5 hover:text-bordo">
                    <Phone className="h-4.5 w-4.5 text-dourado" /> {s.phone}
                  </a>
                </li>
              )}
              {s.email && (
                <li>
                  <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2.5 hover:text-bordo">
                    <Mail className="h-4.5 w-4.5 text-dourado" /> {s.email}
                  </a>
                </li>
              )}
              {(s.address || s.city) && (
                <li className="inline-flex items-start gap-2.5">
                  <MapPin className="mt-1 h-4.5 w-4.5 shrink-0 text-dourado" />
                  {s.address}
                  {s.city ? `, ${s.city}` : ""}
                </li>
              )}
            </ul>
            {s.whatsApp && (
              <a
                href={`https://wa.me/${s.whatsApp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-[14.5px] font-medium text-white shadow-sm transition hover:brightness-95"
              >
                <MessageCircle className="h-4.5 w-4.5" /> Falar no WhatsApp
              </a>
            )}
            <p className="mt-4 text-[13px] text-tinta-soft">
              <Link href="/contactos" className="text-malva underline underline-offset-2">Página de contactos</Link> com mapa e horários completos.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}