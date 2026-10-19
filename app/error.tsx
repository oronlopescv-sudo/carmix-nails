"use client";

// Rede de segurança para exceções de renderização em qualquer segmento abaixo
// do layout raiz (ex.: base de dados em baixo, tabela em falta no primeiro
// deploy). Mantém a identidade do site em vez do 500 crú do hospedeiro.

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-creme px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Ups</p>
        <h1 className="mt-2 font-display text-4xl text-bordo">Algo correu mal</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-tinta-soft">
          Não foi possível carregar esta página. Volte a tentar dentro de momentos.
        </p>
        <button
          onClick={reset}
          className="mt-7 rounded-full bg-bordo px-6 py-3 text-[14.5px] font-medium text-creme transition hover:bg-bordo-dark"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}