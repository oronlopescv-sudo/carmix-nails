import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings, mailConfigured } from "@/lib/settings";
import { getBookableServices, getActiveProfessionals } from "@/lib/queries";
import BookingFlow, { type ServiceOption } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Marcar agendamento",
  description:
    "Escolha o serviço, a data e a hora. Confirmação rápida e transparente, sem esperas ao telefone.",
};

export default async function AgendarPage() {
  const s = await getSettings();

  if (!s.bookingEnabled) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-20 pt-16 text-center sm:px-6">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Marcações</p>
        <h1 className="mt-2 font-display text-4xl text-bordo">Momentaneamente encerrado</h1>
        <p className="mt-4 text-[15.5px] text-tinta-soft">
          O agendamento online está temporariamente desativado.
          {s.whatsApp ? (
            <>
              {" "}Fale connosco{" "}
              <a
                href={`https://wa.me/${s.whatsApp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-malva underline underline-offset-2"
              >
                pelo WhatsApp
              </a>
            </>
          ) : null}{" "}
          ou veja a tabela de serviços.
        </p>
        <Link href="/servicos" className="mt-6 inline-block text-[14.5px] font-medium text-malva hover:text-bordo">
          Ver serviços e preços
        </Link>
      </div>
    );
  }

  const [services, pros, links] = await Promise.all([
    getBookableServices(),
    getActiveProfessionals(),
    db.professionalService.findMany({ select: { professionalId: true, serviceId: true } }),
  ]);

  const servicesByPro = new Map<string, string[]>();
  for (const l of links) {
    const list = servicesByPro.get(l.professionalId) ?? [];
    list.push(l.serviceId);
    servicesByPro.set(l.professionalId, list);
  }

  const groups = Object.values(
    services.reduce<Record<string, { name: string; services: ServiceOption[] }>>(
      (acc, svc) => {
        const key = svc.category?.name ?? "Outros";
        (acc[key] ??= { name: key, services: [] }).services.push({
          id: svc.id,
          name: svc.name,
          description: svc.description,
          priceMin: svc.priceMin,
          priceMax: svc.priceMax,
          durationMin: svc.durationMin,
        });
        return acc;
      },
      {},
    ),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Marcação online</p>
        <h1 className="mt-2 font-display text-4xl text-bordo sm:text-5xl">Marcar a minha hora</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] text-tinta-soft">
          <CalendarCheck className="mr-1 inline h-4 w-4 text-dourado" />
          Escolha o serviço, o dia e a hora — a disponibilidade é real, confirmada de
          seguida pelo estúdio.
        </p>
      </div>

      <div className="mt-10">
        <BookingFlow
          groups={groups}
          professionals={pros.map((p) => ({
            id: p.id,
            name: p.name,
            title: p.title,
            serviceIds: servicesByPro.get(p.id) ?? [],
          }))}
          currency={s.currency}
          emailConfigured={mailConfigured()}
          timezone={s.timezone}
        />
      </div>
    </div>
  );
}