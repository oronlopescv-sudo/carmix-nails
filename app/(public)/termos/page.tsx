import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Termos e condições",
  description: "Condições de marcação, cancelamento e remarcação.",
};

export default async function TermosPage() {
  const s = await getSettings();
  const cancelHours = s.minCancelHours;

  return (
    <div className="prose-carmix mx-auto max-w-3xl px-4 pb-20 pt-12 text-[15px] text-tinta-soft sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Termos</p>
        <h1 className="mt-2 font-display text-4xl text-bordo">Termos e condições</h1>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl text-bordo">1. Marcações</h2>
        <p>
          A marcação online é um pedido: quando o estúdio confirma, o horário está
          reservado para si {s.autoConfirm ? " . As marcações são confirmadas automaticamente " : ""}.
          Recebe um e-mail com o resumo e um número de reserva (referência), que deve
          guardar para consultas ou alterações.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">2. Preços</h2>
        <p>
          Os preços publicados seguem a tabela vigente. As decorações e taxas extras
          (formatos especiais, trabalhos em dedos isolados) não estão incluídas na
          base do serviço — são comunicadas e somadas conforme o pedido.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">3. Cancelamento e remarcação</h2>
        <p>
          {s.cancelPolicyText ||
            `Pode cancelar ou remarcar até ${cancelHours} horas antes da sua marcação, na página da sua reserva, usando a referência e o e-mail da marcação.`}
        </p>
        <p>
          Cancelamentos com menos de {cancelHours} h ou faltas sem aviso podem implicar
          exigência de marcação antecipada ou recusa de serviço, conforme decisão do
          estúdio.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">4. Atrasos</h2>
        <p>
          Um atraso superior a 15 minutos pode tornar o serviço inviável nesse
          horário — será tentado um ajuste ou nova marcação, preservando as
          marcações de outras clientes.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">5. Higiene e execução</h2>
        <p>
          O trabalho é executado conforme acordado; recomenda-se manter as mãos e os
          pés cuidados para um melhor resultado. Não são garantidos resultados sobre
          unhas danificadas sem o tratamento prévio adequado.
        </p>

        <h2 className="mt-6 font-display text-xl text-bordo">6. Privacidade</h2>
        <p>
          Consulte a nossa{" "}
          <Link href="/politica-de-privacidade" className="text-malva underline underline-offset-2">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}