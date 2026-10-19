import Link from "next/link";
import { Phone, Mail, MapPin, Clock, Instagram, Facebook } from "lucide-react";
import { WEEKDAY_LABELS } from "@/lib/constants";
import { minutesToHM } from "@/lib/tz";
import type { DaySchedule } from "@/lib/queries";

function scheduleLine(d: DaySchedule): string | null {
  if (d.windows.length === 0) return null;
  const parts = d.windows.map(([s, e]) => `${minutesToHM(s)}–${minutesToHM(e)}`);
  return parts.join(" e ");
}

export default function Footer({
  brandName,
  ownerName,
  phone,
  email,
  address,
  city,
  instagram,
  facebook,
  schedule,
}: {
  brandName: string;
  ownerName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  schedule: DaySchedule[];
}) {
  const openDays = schedule.filter((d) => d.windows.length > 0).sort((a, b) => {
    if (a.weekday === 0) return 1;
    if (b.weekday === 0) return -1;
    return a.weekday - b.weekday;
  });

  const contactListEmpty = !phone && !email && !address && !city;

  return (
    <footer className="mt-24 border-t border-nude/70 bg-casca">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl text-bordo">{brandName}</p>
          {ownerName && <p className="mt-1 text-sm text-tinta-soft">Por {ownerName}</p>}
          <p className="prose-carmix mt-4 text-sm text-tinta-soft">
            Agendamento online com confirmação transparente. Os seus dados são
            tratados com o máximo cuidado — pode consultar a nossa{" "}
            <Link href="/politica-de-privacidade" className="text-malva underline underline-offset-2">
              política de privacidade
            </Link>
            .
          </p>
          {(instagram || facebook) && (
          <div className="mt-4 flex gap-3">
            {instagram && (
              <a
                href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-full border border-malva-soft text-malva transition hover:bg-malva hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {facebook && (
              <a
                href={facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid h-9 w-9 place-items-center rounded-full border border-malva-soft text-malva transition hover:bg-malva hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
          </div>
          )}
        </div>

        <div className="text-sm">
          <p className="label">Navegação</p>
          <ul className="mt-3 space-y-2 text-tinta-soft">
            <li><Link href="/servicos" className="hover:text-malva">Serviços e preços</Link></li>
            <li><Link href="/agendar" className="hover:text-malva">Marcar agendamento</Link></li>
            <li><Link href="/sobre" className="hover:text-malva">Sobre</Link></li>
            <li><Link href="/galeria" className="hover:text-malva">Galeria</Link></li>
            <li><Link href="/contactos" className="hover:text-malva">Contactos</Link></li>
            <li><Link href="/termos" className="hover:text-malva">Termos e condições</Link></li>
            <li><Link href="/reserva" className="hover:text-malva">Gerir a minha reserva</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="label">Contactos e horário</p>
          {contactListEmpty ? (
            <p className="mt-3 text-sm text-tinta-soft">Contactos ainda não definidos.</p>
          ) : (
          <ul className="mt-3 space-y-2 text-tinta-soft">
              {phone && (
              <li>
                <a href={`tel:${phone}`} className="inline-flex items-center gap-2 hover:text-malva">
                  <Phone className="h-4 w-4 text-dourado" /> {phone}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:text-malva">
                  <Mail className="h-4 w-4 text-dourado" /> {email}
                </a>
              </li>
            )}
            {(address || city) && (
              <li className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-dourado" /> {address}
                {city ? `, ${city}` : ""}
              </li>
            )}
          </ul>
          )}
          <p className="label mt-6">Horário</p>
          <ul className="mt-2 space-y-1 text-tinta-soft">
            {openDays.map((d) => {
              const line = scheduleLine(d);
              if (!line) return null;
              return (
                <li key={d.weekday} className="flex items-baseline gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-malva-soft" />
                    {WEEKDAY_LABELS[d.weekday]}
                  </span>
                  <span className="tabular-nums">{line}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="border-t border-nude/70 py-5 text-center text-xs text-tinta-soft">
        © {new Date().getFullYear()} {brandName}. Todos os direitos reservados.
      </div>
    </footer>
  );
}