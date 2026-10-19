// Configurações: identidade, textos, contactos, regras de agendamento, SEO + utilizadores.

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import SettingsManager, { type SettingsData } from "@/components/admin/SettingsManager";
import UsersManager, { type UserRow } from "@/components/admin/UsersManager";

export default async function ConfiguracoesPage() {
  const [s, users, user] = await Promise.all([
    getSettings(),
    db.user.findMany({ orderBy: [{ name: "asc" }], select: { id: true, name: true, email: true, isActive: true, createdAt: true } }),
    getAuthUser(),
  ]);

  const initial: SettingsData = {
    brandName: s.brandName,
    ownerName: s.ownerName,
    tagline: s.tagline ?? "",
    heroTitle: s.heroTitle ?? "",
    heroSubtitle: s.heroSubtitle ?? "",
    heroImageUrl: s.heroImageUrl,
    aboutTitle: s.aboutTitle ?? "",
    aboutText: s.aboutText ?? "",
    aboutImageUrl: s.aboutImageUrl,
    phone: s.phone ?? "",
    whatsApp: s.whatsApp ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    mapsUrl: s.mapsUrl ?? "",
    instagram: s.instagram ?? "",
    facebook: s.facebook ?? "",
    tiktok: s.tiktok ?? "",
    timezone: s.timezone,
    currency: s.currency,
    slotIntervalMinutes: String(s.slotIntervalMinutes),
    minLeadMinutes: String(s.minLeadMinutes),
    maxLeadDays: String(s.maxLeadDays),
    minCancelHours: String(s.minCancelHours),
    autoConfirm: s.autoConfirm,
    bookingEnabled: s.bookingEnabled,
    allowReschedule: s.allowReschedule,
    cancelPolicyText: s.cancelPolicyText ?? "",
    servicesNote: s.servicesNote ?? "",
    seoTitle: s.seoTitle ?? "",
    seoDescription: s.seoDescription ?? "",
  };

  const userRows: Array<UserRow> = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    createdAtISO: u.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Configurações</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">Tudo o que o site mostra e como motor de reserva se comporta.</p>

      <div className="mt-6 grid gap-6">
        <SettingsManager initial={initial} />
        <UsersManager users={userRows} currentUserId={user?.id ?? ""} />
      </div>
    </div>
  );
}