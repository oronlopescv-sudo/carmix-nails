import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-creme px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Erro 404</p>
        <h1 className="mt-2 font-display text-4xl text-bordo">Página não encontrada</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-tinta-soft">
          O endereço que abriu não existe ou o serviço/publicação foi retirado.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark"
          >
            Voltar ao início
          </Link>
          <Link
            href="/servicos"
            className="rounded-full border border-malva-soft px-6 py-3 text-[14.5px] font-medium text-malva transition hover:border-malva"
          >
            Ver serviços
          </Link>
        </div>
      </div>
    </div>
  );
}