import { cx } from "@/lib/utils";

// Ondas decorativas (bordô / malva / dourado) — elemento típico da marca.
// Usadas nas separações de secções e no rodapé.

export function WaveDivider({
  className,
  flip = false,
  from = "#F8F0F3",
}: {
  className?: string;
  flip?: boolean;
  /** cor da secção abaixo — a onda "encaixa" nela */
  from?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cx("block h-[46px] w-full", className)}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M0,60 C240,100 480,20 720,50 C960,80 1200,30 1440,55 L1440,100 L0,100 Z" fill={from} />
      <path
        d="M0,68 C260,104 520,30 760,58 C1000,86 1240,40 1440,62 L1440,100 L0,100 Z"
        fill="#A94C80"
        opacity="0.30"
      />
      <path
        d="M0,78 C280,112 540,44 780,66 C1020,90 1260,52 1440,72 L1440,100 L0,100 Z"
        fill="#C99A42"
        opacity="0.35"
      />
    </svg>
  );
}

export function WaveBand({ className }: { className?: string }) {
  // faixa de ondas a fundir para o rodapé (bordô)
  return (
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cx("block h-[64px] w-full", className)}
    >
      <path d="M0,50 C220,95 460,15 720,45 C980,75 1220,25 1440,50 L1440,120 L0,120 Z" fill="#A94C80" opacity="0.45" />
      <path d="M0,70 C260,108 520,40 780,62 C1040,84 1280,48 1440,66 L1440,120 L0,120 Z" fill="#C99A42" opacity="0.40" />
      <path d="M0,88 C280,120 560,58 840,76 C1100,92 1300,62 1440,80 L1440,120 L0,120 Z" fill="#850B36" />
    </svg>
  );
}

export function HeroWave({ className }: { className?: string }) {
  // ondas suaves por cima da imagem principal
  return (
    <svg
      viewBox="0 0 1440 180"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cx("block w-full", className)}
    >
      <path d="M0,120 C300,180 600,90 900,130 C1150,163 1300,110 1440,140 L1440,180 L0,180 Z" fill="#C99A42" opacity="0.5" />
      <path d="M0,140 C320,190 640,110 940,145 C1180,172 1320,125 1440,150 L1440,180 L0,180 Z" fill="#A94C80" opacity="0.55" />
      <path d="M0,160 C340,195 680,130 1000,158 C1240,179 1350,140 1440,160 L1440,180 L0,180 Z" fill="#850B36" opacity="0.9" />
    </svg>
  );
}

export function GoldDivider({ className }: { className?: string }) {
  // pequeno ornamento dourado (linha + diamante)
  return (
    <svg viewBox="0 0 240 12" aria-hidden="true" className={cx("mx-auto h-3 w-56", className)}>
      <line x1="0" y1="6" x2="96" y2="6" stroke="#C99A42" strokeWidth="1" />
      <path d="M120 0 L128 6 L120 12 L112 6 Z" fill="#C99A42" />
      <line x1="144" y1="6" x2="240" y2="6" stroke="#C99A42" strokeWidth="1" />
    </svg>
  );
}