import Link from "next/link";
import { Heart } from "lucide-react";

// Banda ameixa escura do desenho do dono:
//  à esquerda "Carmix ♥ Nails Designer", ao centro "Beleza • Cuidado • Confiança"
//  entre linhas finas, à direita o © do ano corrente. Abaixo, numa linha quieta,
//  os links legais e de gestão de reserva para não se perderem.
export default function Footer({ brandName }: { brandName: string }) {
  return (
    <footer className="bg-bordo text-creme">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 px-4 py-7 sm:px-6 lg:flex-row lg:gap-8">
        <span className="inline-flex items-center gap-2.5">
          <span className="font-script text-[38px] leading-none text-creme">Carmix</span>
          <Heart className="h-3.5 w-3.5 fill-creme/90 text-creme/90" aria-hidden="true" />
          <span className="font-display text-[15px] font-medium tracking-wide text-creme/90">
            Nails Designer
          </span>
        </span>

        <span className="inline-flex items-center gap-3 font-display text-[16px] tracking-wide text-creme">
          <span aria-hidden className="h-px w-12 bg-creme/35" />
          Beleza&nbsp;&nbsp;•&nbsp;&nbsp;Cuidado&nbsp;&nbsp;•&nbsp;&nbsp;Confiança
          <span aria-hidden className="h-px w-12 bg-creme/35" />
        </span>

        <span className="text-[11.5px] text-creme/85 lg:text-right">
          © {new Date().getFullYear()} Carmix Nails Designer. Todos os direitos reservados.
        </span>
      </div>

      <div className="border-t border-creme/15">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 py-3 text-[12px] text-creme/70 sm:px-6">
          <Link href="/politica-de-privacidade" className="hover:text-creme">Política de Privacidade</Link>
          <Link href="/termos" className="hover:text-creme">Termos e Condições</Link>
          <Link href="/reserva" className="hover:text-creme">Gerir a minha reserva</Link>
          <Link href="/agendar" className="hover:text-creme">Marcar horário</Link>
          <Link href="/admin" className="hover:text-creme">Área reservada</Link>
        </div>
      </div>
    </footer>
  );
}
