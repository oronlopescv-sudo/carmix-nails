// Formatação de preços. Os valores vivem em centavos da moeda configurada.
// CVE (escudos cabo-verdianos): "2.200$00"  — CVE não usa decimais na prática;
// guardamos centavos para evitar arredondamentos e formatamos com $00.
// EUR: "25,00 €"

export type CurrencyFormat = "CVE" | "EUR";

export function formatPrice(cents: number, currency: string): string {
  if (currency === "EUR") {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  }
  // CVE — formato cabo-verdiano do precário: 2.200$00 (pt-PT agrupa com espaço
  // fino; convertemos para ponto, como o dono escreve na tabela).
  const value = Math.round(cents / 100);
  const grouped = new Intl.NumberFormat("pt-PT", { useGrouping: true })
    .format(value)
    .replace(/[\s  ]/g, ".");
  return `${grouped}$00`;
}

export function formatPriceRange(
  minCents: number,
  maxCents: number | null,
  currency: string,
): string {
  if (maxCents != null && maxCents > minCents) {
    return `${formatPrice(minCents, currency)} – ${formatPrice(maxCents, currency)}`;
  }
  return formatPrice(minCents, currency);
}

export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "CVE", label: "Escudo cabo-verdiano — CVE ($00)" },
  { value: "EUR", label: "Euro — EUR (€)" },
];

export const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Atlantic/Cape_Verde", label: "Cabo Verde (UTC−1) — Atlantic/Cape_Verde" },
  { value: "Europe/Lisbon", label: "Portugal continental — Europe/Lisbon" },
  { value: "Atlantic/Azores", label: "Açores — Atlantic/Azores" },
  { value: "Atlantic/Madeira", label: "Madeira — Atlantic/Madeira" },
  { value: "UTC", label: "UTC" },
];