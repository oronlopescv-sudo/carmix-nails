// Equipa: dados, serviços realizados, horário semanal e bloqueios individuais.

import { db } from "@/lib/db";
import ProfissionaisManager, { type ProFull } from "@/components/admin/ProfissionaisManager";

export default async function ProfissionaisPage() {
  const [services, professionals, links, availability, blocked] = await Promise.all([
    db.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.professional.findMany({ orderBy: [{ name: "asc" }] }),
    db.professionalService.findMany(),
    db.availability.findMany({ orderBy: [{ professionalId: "asc" }, { weekday: "asc" }, { startMinute: "asc" }] }),
    db.blockedPeriod.findMany({ where: { professionalId: { not: null } }, orderBy: [{ startDate: "asc" }] }),
  ]);

  const windowsByPro = new Map<string, ProFull["windows"]>();
  for (const a of availability) {
    const list = windowsByPro.get(a.professionalId) ?? [];
    list.push({ weekday: a.weekday, startMinute: a.startMinute, endMinute: a.endMinute, isActive: a.isActive });
    windowsByPro.set(a.professionalId, list);
  }
  const blockedByPro = new Map<string, ProFull["blocked"]>();
  for (const b of blocked) {
    if (!b.professionalId) continue;
    const list = blockedByPro.get(b.professionalId) ?? [];
    list.push({
      id: b.id,
      type: b.type,
      startDateISO: toISO(b.startDate),
      endDateISO: toISO(b.endDate),
      startMinute: b.startMinute,
      endMinute: b.endMinute,
      reason: b.reason,
    });
    blockedByPro.set(b.professionalId, list);
  }

  const pros: Array<ProFull> = professionals.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    description: p.description,
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    serviceIds: links.filter((l) => l.professionalId === p.id).map((l) => l.serviceId),
    windows: windowsByPro.get(p.id) ?? [],
    blocked: blockedByPro.get(p.id) ?? [],
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Profissionais</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">
        Equipa, serviços que cada pessoa realiza, horário semanal e bloqueios (férias, folgas, ausências).
      </p>
      <div className="mt-6">
        <ProfissionaisManager services={services} professionals={pros} />
      </div>
    </div>
  );
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}