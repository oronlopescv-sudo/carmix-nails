import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock, ArrowLeft, Info } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/pricing";
import { GoldDivider } from "@/components/ui/Waves";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    const svc = await db.service.findUnique({ where: { slug }, select: { name: true, description: true } });
    if (!svc) return { title: "Serviço não encontrado" };
    return { title: svc.name, description: svc.description?.slice(0, 160) ?? undefined };
  } catch {
    // Base de dados indisponível: metadados neutros em vez de falhar o pedido.
    return { title: "Serviço" };
  }
}

export default async function ServicoPage({ params }: Params) {
  const { slug } = await params;
  let svc: Prisma.ServiceGetPayload<{ include: { category: { select: { name: true; slug: true } } } }> | null = null;
  try {
    svc = await db.service.findUnique({
      where: { slug },
      include: { category: { select: { name: true, slug: true } } },
    });
  } catch (e) {
    console.error("[carmix] serviço:", e);
  }
  if (!svc || !svc.isActive) notFound();
  const s = await getSettings();

  return (
    <article className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <Link
        href="/servicos"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-malva hover:text-bordo"
      >
        <ArrowLeft className="h-4 w-4" /> Serviços e preços
      </Link>

      <header className="mt-8 text-center">
        {svc.category?.name && (
          <p className="text-[12px] uppercase tracking-[0.3em] text-malva">{svc.category.name}</p>
        )}
        <h1 className="mt-2 font-display text-4xl leading-tight text-bordo sm:text-5xl">{svc.name}</h1>
        <GoldDivider className="mt-5" />
      </header>

      <div className="mt-10 overflow-hidden rounded-[1.75rem] bg-casca ring-1 ring-nude">
        {svc.imageUrl && (
          <div className="relative aspect-[16/9]">
            <Image
              src={svc.imageUrl}
              alt={svc.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}
        <div className="grid gap-6 p-7 sm:grid-cols-3 sm:p-9">
          <div>
            <p className="label">Preço</p>
            <p className="font-display text-3xl text-bordo">{formatPrice(svc.priceMin, s.currency)}</p>
            {svc.priceMax != null && svc.priceMax > svc.priceMin && (
              <p className="mt-1 text-[13px] text-tinta-soft">até {formatPrice(svc.priceMax, s.currency)}, conforme a elaboração</p>
            )}
          </div>
          <div>
            <p className="label">Duração</p>
            <p className="font-display text-3xl text-tinta">
              ~{svc.durationMin}<span className="ml-1 text-base">min</span>
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-tinta-soft">
              <Clock className="h-3.5 w-3.5 text-malva-soft" /> inclui preparação
            </p>
          </div>
          <div className="flex items-end">
            {!s.bookingEnabled ? (
              <span className="text-[13.5px] text-tinta-soft">Marcações temporariamente desativadas.</span>
            ) : (
              <Link
                href="/agendar"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-bordo px-6 py-3.5 text-[15px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
              >
                <CalendarCheck className="h-4.5 w-4.5" /> Marcar Agendamento
              </Link>
            )}
          </div>
        </div>
      </div>

      {svc.description && (
        <div className="prose-carmix mt-8 text-[15.5px] text-tinta-soft">
          <p>{svc.description}</p>
        </div>
      )}

      {s.servicesNote && (
        <p className="mt-8 flex items-start gap-2.5 rounded-xl bg-nude p-4 text-[13.5px] text-tinta-soft">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-dourado" />
          {s.servicesNote}
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-4 text-center">
        <Link
          href="/termos"
          className="text-[13px] text-tinta-soft underline underline-offset-2 hover:text-malva"
        >
          Termos e política de cancelamento
        </Link>
      </div>
    </article>
  );
}