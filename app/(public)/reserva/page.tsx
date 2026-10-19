import type { Metadata } from "next";
import { ReservationLookupForm } from "@/components/booking/ReservationLookupForm";

export const metadata: Metadata = {
  title: "Gerir a minha reserva",
  description: "Consulte, cancele ou remarque a sua marcação com a referência e o seu e-mail.",
};

export default function ReservaIndexPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-20 pt-16 sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Reservas</p>
        <h1 className="mt-2 font-display text-4xl text-bordo">Gerir a minha reserva</h1>
        <p className="mt-4 text-[15px] text-tinta-soft">
          Indique o número da reserva (começa por <strong>CN-</strong>) e o e-mail que
          usou na marcação para ver os detalhes, cancelar ou remarcar.
        </p>
      </div>
      <ReservationLookupForm />
    </div>
  );
}