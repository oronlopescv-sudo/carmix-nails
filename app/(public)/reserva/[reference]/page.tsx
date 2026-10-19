import type { Metadata } from "next";
import Link from "next/link";
import { findAppointmentByReference } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { ReservationPanel } from "@/components/booking/ReservationPanel";

type Params = { params: Promise<{ reference: string }> };

export const metadata: Metadata = {
  title: "Detalhes da reserva",
  robots: { index: false, follow: false },
};

export default async function ReservaPage({ params }: Params) {
  const { reference } = await params;
  const ref = decodeURIComponent(reference).trim().toUpperCase();
  const [appt, s] = await Promise.all([findAppointmentByReference(ref), getSettings()]);

  const notFound = !appt;
  const summary = notFound
    ? null
    : {
        reference: appt!.reference,
        serviceName: appt!.service.name,
        professionalName: appt!.professional.name,
        status: appt!.status as string,
        startAtISO: appt!.startAt.toISOString(),
      };

  return (
    <div className="mx-auto max-w-xl px-4 pb-20 pt-14 sm:px-6">
      {notFound ? (
        <div className="text-center">
          <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Reservas</p>
          <h1 className="mt-2 font-display text-3xl text-bordo">Reserva não encontrada</h1>
          <p className="mt-4 text-[15px] text-tinta-soft">
            Não encontrámos a referência <span className="font-mono">{ref}</span>. Verifique
            os caracteres e tente de novo — o número aparece no e-mail de confirmação.
          </p>
          <Link href="/reserva" className="mt-6 inline-block text-[14.5px] font-medium text-malva hover:text-bordo">
            ← Tentar outra referência
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center">
            <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Reserva {summary!.reference}</p>
            <h1 className="mt-2 font-display text-3xl text-bordo">{summary!.serviceName}</h1>
          </div>
          <ReservationPanel
            reference={summary!.reference}
            serviceName={summary!.serviceName}
            professionalName={summary!.professionalName}
            status={summary!.status}
            startAtISO={summary!.startAtISO}
            timezone={s.timezone}
            allowReschedule={s.allowReschedule}
            minCancelHours={s.minCancelHours}
          />
        </>
      )}
    </div>
  );
}