import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Clock } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPriceRange } from "@/lib/pricing";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Serviços e preços",
  description:
    "Tabela de preços: unhas de gel com fibras (S a XXXL), banho de gel, pedicure, decorações, manutenção e remoção.",
};

export default async function ServicosPage() {
  const s = await getSettings();
  let categories: Array<Prisma.CategoryGetPayload<{ include: { services: true } }>> = [];
  try {
    categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        services: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
  } catch (e) {
    console.error("[carmix] categorias — base de dados indisponível:", e);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Tabela de preços</p>
        <h1 className="mt-2 font-display text-4xl text-bordo sm:text-5xl">Serviços</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] text-tinta-soft">
          Todos os serviços incluem a preparação da unha natural. Escolha o seu e marque a hora online, sem esperas.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {categories.map((cat, ci) => (
          <Reveal key={cat.id} delay={ci * 0.05}>
            <section aria-labelledby={`cat-${cat.slug}`}>
              <h2 id={`cat-${cat.slug}`} className="font-display text-2xl text-bordo">
                {ci + 1}. {cat.name}
              </h2>
              <ul className="mt-4 divide-y divide-nude overflow-hidden rounded-2xl bg-creme shadow-sm ring-1 ring-nude">
                {cat.services.map((svc) => (
                  <li key={svc.id}>
                    <Link
                      href={`/servicos/${svc.slug}`}
                      className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-4 transition hover:bg-casca"
                    >
                      <div>
                        <p className="font-medium text-tinta group-hover:text-bordo">{svc.name}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-tinta-soft">
                          <Clock className="h-3.5 w-3.5 text-malva-soft" /> {svc.durationMin} min
                        </p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="font-display text-lg text-bordo sm:text-xl">
                          {formatPriceRange(svc.priceMin, svc.priceMax, s.currency)}
                        </span>
                      </p>
                    </Link>
                  </li>
                ))}
                {cat.services.length === 0 && (
                  <li className="px-5 py-4 text-[13.5px] text-tinta-soft">Sem serviços publicados nesta categoria.</li>
                )}
              </ul>
            </section>
          </Reveal>
        ))}
      </div>

      {s.servicesNote && (
        <p className="mt-10 rounded-2xl bg-nude p-5 text-[14px] leading-relaxed text-tinta-soft ring-1 ring-malva-soft/40">
          <strong className="font-medium text-bordo">Nota:</strong> {s.servicesNote}
        </p>
      )}

      <div className="mt-12 text-center">
        {!s.bookingEnabled ? (
          <p className="text-sm text-tinta-soft">
            As marcações estão temporariamente desativadas. Contacte-nos{""}
            {s.whatsApp ? (
              <a
                className="text-malva underline underline-offset-2"
                href={`https://wa.me/${s.whatsApp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                &nbsp;pelo WhatsApp
              </a>
            ) : null}
            .
          </p>
        ) : (
          <Link
            href="/agendar"
            className="inline-flex items-center gap-2 rounded-full bg-bordo px-8 py-4 text-[15.5px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
          >
            <CalendarCheck className="h-4.5 w-4.5" /> Marcar Agendamento
          </Link>
        )}
      </div>
    </div>
  );
}