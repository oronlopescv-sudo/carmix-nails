import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
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
  const [exists, s] = await Promise.all([
    db.appointment.findUnique({ where: { reference: ref }, select: { id: true } }),
    getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-xl px-4 pb-20 pt-14 sm:px-6">
      {exists ? (
        <>
          <div className="text-center">
            <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Reserva {ref}</p>
            <h1 className="mt-2 font-display text-3xl text-bordo">A sua reserva</h1>
          </div>
          {/* Os detalhes (serviço, data, estado) só aparecem DEPOIS de o cliente
              verificar o e-mail — no servidor, via reservationMetadataAction.
              Nada é passado como props: o payload RSC seria lido por quem só
              tem a referência. */}
          <ReservationPanel
            reference={ref}
            timezone={s.timezone}
            allowReschedule={s.allowReschedule}
            minCancelHours={s.minCancelHours}
          />
        </>
      ) : (
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
      )}
    </div>
  );
}