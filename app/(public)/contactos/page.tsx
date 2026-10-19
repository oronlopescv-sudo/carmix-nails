import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, Clock, MessageCircle, ExternalLink } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getScheduleSummary } from "@/lib/queries";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/constants";
import { minutesToHM } from "@/lib/tz";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Telefone, WhatsApp e horário de funcionamento do estúdio.",
};

export default async function ContactosPage() {
  const [s, schedule] = await Promise.all([getSettings(), getScheduleSummary()]);
  const wa = s.whatsApp ? s.whatsApp.replace(/\D/g, "") : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Contactos</p>
        <h1 className="mt-2 font-display text-4xl text-bordo sm:text-5xl">Estamos aqui</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] text-tinta-soft">
          Prefere falar connosco ou marcar diretamente? Use os contactos abaixo ou o agendamento online.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-creme p-7 shadow-sm ring-1 ring-nude">
          <h2 className="font-display text-2xl text-bordo">Contactos diretos</h2>
          <ul className="mt-5 space-y-4 text-[15px]">
            {s.phone && (
              <li>
                <a href={`tel:${s.phone}`} className="inline-flex items-center gap-3 hover:text-bordo">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-nude text-bordo">
                    <Phone className="h-4.5 w-4.5" />
                  </span>
                  {s.phone}
                </a>
              </li>
            )}
            {s.email && (
              <li>
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-3 hover:text-bordo">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-nude text-bordo">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  {s.email}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:opacity-90">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-white">
                    <MessageCircle className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    WhatsApp
                    <span className="block text-[12.5px] text-tinta-soft">Resposta habitual durante o horário de funcionamento</span>
                  </span>
                </a>
              </li>
            )}
            {(s.address || s.city) && (
              <li className="inline-flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-nude text-bordo">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <span>
                  {s.address}
                  {s.city ? `, ${s.city}` : ""}
                  {s.mapsUrl && (
                    <a
                      href={s.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-malva hover:text-bordo"
                    >
                      Ver no mapa <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </li>
            )}
          </ul>
          {!s.bookingEnabled ? null : (
            <Link
              href="/agendar"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark"
            >
              Marcar Agendamento
            </Link>
          )}
        </section>

        <section className="rounded-2xl bg-casca p-7 ring-1 ring-nude">
          <h2 className="flex items-center gap-2 font-display text-2xl text-bordo">
            <Clock className="h-5 w-5 text-dourado" /> Horário
          </h2>
          <table className="mt-5 w-full text-[14.5px]">
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const d = schedule.find((x) => x.weekday === wd);
                const open = (d?.windows.length ?? 0) > 0;
                return (
                  <tr key={wd} className={open ? "" : "text-tinta-soft/60"}>
                    <td className="border-b border-nude/60 py-2.5 pr-4">{WEEKDAY_LABELS[wd]}</td>
                    <td className="border-b border-nude/60 py-2.5 text-right tabular-nums">
                      {open ? d!.windows.map(([a, b]) => `${minutesToHM(a)}–${minutesToHM(b)}`).join(" · ") : "Fechado"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-[13px] text-tinta-soft">
            A disponibilidade em tempo real aparece no{" "}
            <Link href="/agendar" className="text-malva underline underline-offset-2">
              agendamento online
            </Link>
            .
          </p>
        </section>
      </div>

      {s.mapsUrl ? (
        <div className="mt-8 overflow-hidden rounded-2xl ring-1 ring-nude">
          <iframe
            src={s.mapsUrl}
            title="Localização no mapa"
            className="h-72 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}

      <p className="mt-10 text-center text-[13px] text-tinta-soft">
        Ao contactar connosco aplica-se a nossa{" "}
        <Link href="/politica-de-privacidade" className="text-malva underline underline-offset-2">política de privacidade</Link>
        {" "}e os{" "}
        <Link href="/termos" className="text-malva underline underline-offset-2">termos</Link>.
      </p>
    </div>
  );
}