import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Star, ArrowRight, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { getSettings } from "@/lib/settings";
import {
  getFeaturedServices,
  getVisibleGallery,
  getPublishedReviews,
  getScheduleSummary,
  nextOpening,
} from "@/lib/queries";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/constants";
import { minutesToHM, wallNow, weekdayOfDay } from "@/lib/tz";
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
      <section className="relative overflow-hidden bg-gradient-to-r from-creme via-casca to-nude">
        <div className="relative mx-auto grid min-h-[540px] max-w-6xl items-center px-4 pb-14 pt-10 sm:px-6 md:min-h-[600px] md:pb-16">
          <div className="animate-fade-up relative z-10 text-center md:w-1/2 md:text-left">
            <p className="text-[18px] uppercase tracking-[0.4em] text-malva">Bem-vinda ao</p>
            <p className="-mt-3 font-script text-[88px] leading-none text-bordo sm:text-[140px]">{s.brandName}</p>
            <p className="-mt-2 font-display text-4xl text-tinta sm:text-5xl">Nails Designer</p>
            <p className="mx-auto mt-6 max-w-sm text-[20px] leading-relaxed text-tinta md:mx-0">
              {s.heroSubtitle || "Beleza nas suas mãos, com muito amor e dedicação!"}
            </p>
            <div className="mt-8 flex justify-center md:justify-start">
              {!s.bookingEnabled ? (
                <span className="rounded-full bg-white px-6 py-3 text-sm text-tinta-soft shadow-sm">
                  As marcações estão temporariamente desativadas — use o WhatsApp.
                </span>
              ) : (
                <Link
                  href="/agendar"
                  className="group inline-flex items-center gap-3 rounded-full bg-malva px-9 py-4 text-[17px] font-medium text-creme shadow-md shadow-malva/30 transition hover:bg-bordo active:scale-[0.98]"
                >
                  <CalendarCheck className="h-5 w-5" />
                  Agende já o seu horário
                  <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 w-full md:w-[58%]">
            <Image
              src={s.heroImageUrl || "/images/home/hero-nails.jpg"}
              alt={`Unhas feitas na ${s.brandName}`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 58vw"
              className="object-cover object-[center_40%]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-casca via-casca/40 to-transparent md:via-transparent" />
          </div>
        </div>
      </section>

      {/* ── Serviços (faixa de ícones) ───────────────────────── */}
      <section className="bg-casca py-14 sm:py-16" id="servicos-destaque">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="flex items-center justify-center gap-5">
              <span className="hidden h-px w-24 bg-malva/50 sm:block" />
              <h2 className="font-script text-5xl text-malva sm:text-6xl">Os Nossos Serviços</h2>
              <span className="hidden h-px w-24 bg-malva/50 sm:block" />
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {featured.slice(0, 7).map((svc, i) => (
              <Reveal key={svc.id} delay={i * 0.05}>
                <Link
                  href={`/servicos/${svc.slug}`}
                  className="group flex h-full flex-col items-center justify-start rounded-2xl bg-white px-3 pb-6 pt-7 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Image src={`/images/home/icon-${i + 1}.png`} alt="" width={84} height={61} className="h-[61px] w-auto" />
                  <span className="mt-4 text-[15px] leading-snug text-tinta group-hover:text-bordo">{svc.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-8 text-center">
              <Link href="/servicos" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-malva hover:text-bordo">
                Ver todos os serviços e preços <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Sobre · Logótipo · Galeria · Contactos ───────────── */}
      <section className="bg-creme py-16 sm:py-20" id="sobre">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.8fr_1.3fr_1fr] lg:gap-8">
          <Reveal>
            <div className="flex flex-col">
              <h2 className="font-script text-5xl text-bordo">{s.aboutTitle || "Sobre o Carmix"}</h2>
              <p className="mt-5 text-[16px] leading-relaxed text-tinta">
                {(s.aboutText || `${s.brandName} é o espaço de ${s.ownerName}, dedicado a unhas de gel com fibras e cuidados com as mãos e os pés.`)
                  .split("\n\n")[0]}
              </p>
              <Link
                href="/sobre"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[15px] font-medium text-creme transition hover:bg-bordo-dark"
              >
                Saber mais <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mx-auto w-full max-w-[260px] lg:mt-6">
              <Image src="/images/logo-carmix.jpg" alt={s.brandName} width={1170} height={1197} className="h-auto w-full" />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-col items-center">
              <div className="flex w-full items-center gap-4">
                <span className="h-px flex-1 bg-malva/50" />
                <h2 className="font-script text-4xl text-malva sm:text-5xl">A Nossa Galeria</h2>
                <span className="h-px flex-1 bg-malva/50" />
              </div>
              <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                {(gallery.length > 0
                  ? gallery.slice(0, 4).map((img) => ({ key: img.id, src: img.imageUrl, alt: img.alt || img.title || "Trabalho da Carmix Nails" }))
                  : ["galeria-1", "galeria-2", "galeria-3", "galeria-4"].map((n) => ({ key: n, src: `/images/home/${n}.jpg`, alt: "Trabalho da Carmix Nails" }))
                ).map((img) => (
                  <div key={img.key} className="relative aspect-square overflow-hidden rounded-xl bg-casca">
                    <Image src={img.src} alt={img.alt} fill sizes="(max-width: 640px) 50vw, 14vw" className="object-cover" />
                  </div>
                ))}
              </div>
              <Link
                href="/galeria"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-malva px-7 py-3 text-[15px] font-medium text-creme transition hover:bg-bordo"
              >
                Ver mais fotos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="relative overflow-hidden rounded-2xl bg-nude p-7 sm:p-8">
              <Image src="/images/home/leaves.png" alt="" width={111} height={120} aria-hidden className="pointer-events-none absolute right-0 top-0 h-28 w-auto opacity-90" />
              <h2 className="font-script text-4xl text-bordo">Contacte-nos</h2>
              <ul className="mt-6 space-y-4 text-[15px] text-tinta">
                {s.phone && (
                  <li>
                    <a href={`tel:${s.phone}`} className="inline-flex items-center gap-3 hover:text-bordo">
                      <Phone className="h-4.5 w-4.5 text-malva" /> {s.phone}
                    </a>
                  </li>
                )}
                {(s.address || s.city) && (
                  <li className="inline-flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-malva" />
                    <span>{[s.address, s.city].filter(Boolean).join(", ")}</span>
                  </li>
                )}
                {s.email && (
                  <li>
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-3 break-all hover:text-bordo">
                      <Mail className="h-4.5 w-4.5 shrink-0 text-malva" /> {s.email}
                    </a>
                  </li>
                )}
              </ul>
              <div className="mt-7 flex items-center justify-end gap-4">
                <Link href="/contactos" className="text-[14px] font-medium text-malva underline underline-offset-2 hover:text-bordo">
                  Página de contactos
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testemunhos ─────────────────────────────────────── */}
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
            {reviews.length === 0 && (
              <p className="mt-8 rounded-xl bg-casca p-5 text-[14.5px] text-tinta-soft ring-1 ring-nude">
                Os testemunhos das clientes aparecem aqui assim que forem publicados.
              </p>
            )}
          </div>
        </section>

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