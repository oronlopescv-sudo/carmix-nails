// Traços do desenho do dono (design/site/home-desenho.png), em SVG traçado
// matemático: o coração é a curva paramétrica clássica, percorrida de uma só
// vez (ponta inferior → lobo direito → vale → lobo esquerdo) e saindo no rabo
// comprido de floreio.
export const TRACO = "#7d2877";

function pontos(t0: number, t1: number, N: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([x, y]);
  }
  return pts;
}

function caminho(pts: [number, number][], cx: number, cy: number, s: number): string {
  let d = `M${(cx + s * pts[0][0]).toFixed(1)} ${(cy + s * pts[0][1]).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L${(cx + s * pts[i][0]).toFixed(1)} ${(cy + s * pts[i][1]).toFixed(1)}`;
  }
  return d;
}

export function FloreioCoracao({ className = "" }: { className?: string }) {
  // coração de uma só linha (ponta → lobo direito → vale → lobo esquerdo),
  // saindo da ponta no rabo comprido, como no desenho
  const corpo = caminho(pontos(Math.PI, 3 * Math.PI, 72), 26, 22, 1.2);
  // ponta inferior: em t=π → (0,-13) → y = 22 + 1.2*13 = 37.6
  return (
    <svg
      viewBox="0 0 132 78"
      fill="none"
      aria-hidden
      className={className}
      style={{ overflow: "visible" }}
    >
      <path
        d={`${corpo} L26 38 C40 44 60 46 80 41 C98 37 112 42 130 48`}
        stroke={TRACO}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OrnamentoCoracao({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 34"
      fill="none"
      aria-hidden
      className={className}
      style={{ overflow: "visible" }}
    >
      <path
        d="M2 20 C40 22 74 20 98 18"
        stroke={TRACO}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M124 18 C146 20 180 22 218 20"
        stroke={TRACO}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* coração pequeno de contorno ao centro */}
      <path
        d={caminho(pontos(0, 2 * Math.PI, 48), 110, 12, 0.4)}
        stroke={TRACO}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
