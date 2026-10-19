import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Sparkles, Heart, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getPublishedReviews } from "@/lib/queries";
import { Reveal } from "@/components/ui/Reveal";
import { GoldDivider } from "@/components/ui/Waves";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça o espaço e a profissional por trás da Carmix Nails.",
};

export default async function SobrePage() {
  const s = await getSettings();
  const reviews = await getPublishedReviews(3);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Sobre</p>
        <h1 className="mt-2 font-display text-4xl text-bordo sm:text-5xl">
          {s.aboutTitle || `Conheça ${s.ownerName}`}
        </h1>
        <GoldDivider className="mt-5" />
      </div>

      <div className="mt-12 grid items-start gap-10 md:grid-cols-2">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-casca shadow-md ring-1 ring-nude">
            {s.aboutImageUrl ? (
              <Image src={s.aboutImageUrl} alt={`${s.ownerName} — ${s.brandName}`} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-nude to-malva-soft/40 p-10 text-center">
                <p className="text-sm text-tinta-soft">Fotografia do espaço no painel administrativo.</p>
              </div>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="prose-carmix text-[15.5px] text-tinta-soft">
            {(s.aboutText ||
              `${s.brandName} nasceu do gosto de ${s.ownerName} pelo cuidado das mãos e dos pés. Trabalha-se unhas de gel com fibras, banho de gel, pedicure e decorações personalizadas — sempre com produtos de qualidade e tempo suficiente para um resultado bonito e duradouro.\n\nCada cliente é atendida individualmente, com horário próprio: nunca há dobras e cada trabalho recebe a atenção que merece.`)
              .split("\n\n")
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>

          <ul className="mt-8 space-y-4">
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-dourado" />
              <div>
                <p className="font-medium text-tinta">Produtos de qualidade</p>
                <p className="text-[14px] text-tinta-soft">Gel e fibras de marcas de confiança, com preparação adequada da unha.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Heart className="mt-0.5 h-5 w-5 shrink-0 text-dourado" />
              <div>
                <p className="font-medium text-tinta">Atendimento individual</p>
                <p className="text-[14px] text-tinta-soft">Uma cliente de cada vez, sem pressa — o seu horário é seu.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-dourado" />
              <div>
                <p className="font-medium text-tinta">Marcação online transparente</p>
                <p className="text-[14px] text-tinta-soft">Recebe confirmação por e-mail e pode cancelar ou remarcar até 24 h antes.</p>
              </div>
            </li>
          </ul>
        </Reveal>
      </div>

      {reviews.length > 0 && (
        <Reveal>
          <section className="mt-16">
            <h2 className="font-display text-2xl text-bordo">Testemunhos</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="rounded-2xl bg-casca p-5 ring-1 ring-nude">
                  <blockquote className="text-[13.5px] text-tinta">“{r.text}”</blockquote>
                  <figcaption className="mt-3 text-[12.5px] font-medium text-tinta-soft">— {r.customerName}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <div className="mt-14 rounded-[1.75rem] bg-bordo px-6 py-10 text-center text-creme">
        <p className="font-display text-2xl">Tem ideia do que quer? Marque já.</p>
        <p className="mt-2 text-[14px] opacity-90">Escolha a hora que combina com você — tudo online, em dois minutos.</p>
        {!s.bookingEnabled ? (
          <p className="mt-5 text-sm opacity-80">Marcações temporariamente desativadas.</p>
        ) : (
          <Link href="/agendar" className="mt-6 inline-flex items-center gap-2 rounded-full bg-creme px-7 py-3.5 text-[15px] font-medium text-bordo transition hover:bg-nude">
            <CalendarCheck className="h-4.5 w-4.5" /> Marcar Agendamento
          </Link>
        )}
      </div>
    </div>
  );
}