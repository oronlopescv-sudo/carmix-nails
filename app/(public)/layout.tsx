// Casca das páginas públicas: cabeçalho configurável + rodapé.
// As páginas vivem em app/(public)/ — os caminhos não mudam.

// Sempre renderizado em pedido: o que o dono muda no painel (preços, fotos,
// textos, horários) aparece no site de imediato, sem reimplantação.
export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import { getScheduleSummary } from "@/lib/queries";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const schedule = await getScheduleSummary();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        brandName={s.brandName}
        phone={s.phone}
        whatsApp={s.whatsApp}
        bookingDisabled={!s.bookingEnabled}
      />
      <main className="flex-1">{children}</main>
      <Footer
        brandName={s.brandName}
        ownerName={s.ownerName}
        phone={s.phone}
        email={s.email}
        address={s.address}
        city={s.city}
        instagram={s.instagram}
        facebook={s.facebook}
        schedule={schedule}
      />
    </div>
  );
}